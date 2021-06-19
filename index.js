const { resolve, join } = require("path");
const { existsSync, readFileSync, writeFileSync, rmSync, copyFileSync, appendFile, appendFileSync } = require("fs");
const { cpus, freemem, tmpdir } = require("os")
const { cwd, exit } = require("process");
const { exec, spawnSync, execSync } = require("child_process");

const yaml = {parse: require("js-yaml").load, stringify: require("js-yaml").dump};
const ConfigsQemu = require("./MacOS/configs_valids.json")
const { FetchOS } = require("./lib/Fetch_BaseSystem")
const CurrentPath = (process.env.SAVE_FILES || cwd());

// Config
const RunQemu = []
var OSConfig = {
    Install: {
        enable: true,
        system: {
            name: "Catalina",
            path: join(CurrentPath, "MacOS_Installer.img")
        }
    },
    spec: {
        cpu: {
            cores: parseInt(Math.abs(cpus().length / 2)),
            threads: parseInt(Math.abs(cpus().length * 2)),
            sockets: 1,
            family: "Penryn",
            options: "+ssse3,+sse4.2,+popcnt,+avx,+aes,+xsave,+xsaveopt,check"
        },
        ram: {
            MEM_MB: Math.trunc(((freemem() / 2) / 1024 / 1024) - 24)
        },
        ShowConsoleLog: true,
        SaveLog: true
    },
    storage: [
        {
            PATH: join(CurrentPath, "MacOSHDD.img"),
            TYPE: "qcow2",
            QEMU_ID: "MacHDD",
            SATA_ID: 4,
            SIZE_GB: 128
        }
    ],
    network: {
        mac: "52:54:00:c9:18:27"
    },
    video: {
        type: "VGA",
        mem: 128
    },
}

const osPathConfig = resolve(CurrentPath, "MacOSConfig.yaml");
if (existsSync(osPathConfig)) OSConfig = yaml.parse(readFileSync(osPathConfig, "utf8"));
else {
    console.log("Saving Initial Settings, please edit the MacOSConfig.yaml file");
    writeFileSync(osPathConfig, yaml.stringify(OSConfig));
    console.log("Going out");
    process.exit(0)
}

const CpuFamily = ConfigsQemu.cpu[OSConfig.spec.cpu.family]
// Ram Family Limit
if (CpuFamily.ram <= OSConfig.spec.ram) {console.log("RAM limit reached for this family"); OSConfig.spec.ram = CpuFamily.ram}
// Core Family Limit
if (CpuFamily.core <= OSConfig.spec.cores) {console.log("Number of Cores reached for this processor family"); OSConfig.spec.cores = CpuFamily.core}
// Threads Family Limit
if (CpuFamily.threads <= OSConfig.spec.threads) {console.log("Number of Threads Reaching Processor Family Limit"); OSConfig.spec.threads = CpuFamily.threads}

const Opencore_Path = resolve(__dirname, "MacOS/OpenCORE", OSConfig.spec.cpu.family);
const BiosBootPath = resolve(__dirname, "MacOS/PFLASH")

console.log("\n\n------------- System Spec");
RunQemu.push(
    `-enable-kvm -m "${parseInt(OSConfig.spec.ram.MEM_MB)}"`,
    `-cpu ${CpuFamily.cpu_name},kvm=on,vendor=GenuineIntel,+invtsc,vmware-cpuid-freq=on,"${OSConfig.spec.cpu.options}"`,
    `-machine q35`,
    "-usb -device usb-kbd -device usb-tablet",
    `-smp "${OSConfig.spec.cpu.threads}",cores="${OSConfig.spec.cpu.cores}",sockets="${OSConfig.spec.cpu.sockets}"`,
    "-device usb-ehci,id=ehci",
    `-device isa-applesmc,osk="ourhardworkbythesewordsguardedpleasedontsteal(c)AppleComputerInc"`,
    `-drive if=pflash,format=raw,readonly,file="${join(BiosBootPath, "OVMF_CODE.fd")}"`,
    `-drive if=pflash,format=raw,file="${join(BiosBootPath, "OVMF_VARS-1024x768.fd")}"`,
    "-smbios type=2",
    "-device ich9-intel-hda -device hda-duplex",
    "-device ich9-ahci,id=sata",
    `-drive id=OpenCoreBoot,if=none,snapshot=on,format=qcow2,file="${join(Opencore_Path, "OpenCore.qcow2")}"`,
    "-device ide-hd,bus=sata.2,drive=OpenCoreBoot",
    // `-drive id=MacHDD,if=none,file="${OSConfig.devices.hd.MacOS.path}",format=qcow2 -device ide-hd,bus=sata.4,drive=MacHDD`,
    `-netdev user,id=net0 -device vmxnet3,netdev=net0,id=net0,mac=${OSConfig.network.mac}`,
    "-monitor stdio"
)

console.log("\n\n------------- Storage");
// Storage
for (let _HDD of OSConfig.storage){
    // const HDD = ConfigsQemu.harddisk[_HDD.TYPE]
    var HDD = ConfigsQemu.harddisk["qcow2"]
    // Create Image
    if (!(existsSync(_HDD.PATH)) && (HDD.type === "virtual")) execSync(`qemu-img create -f ${_HDD.TYPE} ${_HDD.PATH} ${_HDD.SIZE_GB}G`);
    var command = HDD.command.split("${{PATH}}").join(_HDD.PATH)
        .split("${{ID}}").join(_HDD.QEMU_ID)
        .split("${{SATA_ID}}").join(_HDD.SATA_ID)
    console.log(command);
    RunQemu.push(command)
}

console.log("\n\n------------- Video");
// Video
if (OSConfig.video.type.toLocaleLowerCase() === "vga") RunQemu.push(`-device VGA,vgamem_mb=${OSConfig.video.mem || 128}`);
else {
    console.log("Starting MacOS with vnc on all network interfaces")
    RunQemu.push("-vnc 0.0.0.0:0")
}

if (OSConfig.Install.enable === true) {
    console.log("\n\n------------- Download MacOS Installer");
    if (existsSync(OSConfig.Install.system.path)) rmSync(OSConfig.Install.system.path, {force: true})
    // console.log("---------------------------------\n\n");
    const __MacOSDOwnload = FetchOS(OSConfig.Install.system.name)
    console.log("Converting from dmg to img");
    const __MacDMGConvert = execSync(`qemu-img convert ${__MacOSDOwnload.System} -O raw ${OSConfig.Install.system.path}`).toString()
    // console.log(__MacDMGConvert);
    
    // -
    rmSync(__MacOSDOwnload.System, {force: true})
    rmSync(__MacOSDOwnload.Chunklist, {force: true})
    // -
    RunQemu.push(
        "-device ide-hd,bus=sata.3,drive=InstallMedia",
        `-drive id=InstallMedia,if=none,file="${OSConfig.Install.system.path}",format=raw`
    );
}

// Run Qemu
console.log("starting qemu");
const CommandExec = `qemu-system-x86_64 ${RunQemu.join(" ")}`

console.log(CommandExec);

const RunQemuCommand = exec(CommandExec, {cwd: CurrentPath});
const LogPath = join(CurrentPath, "KVMQemu.log")
if (OSConfig.spec.SaveLog) writeFileSync(LogPath, `Command Exec: ${CommandExec}\n\n`)
RunQemuCommand.stdout.on("data", data => {
    if (OSConfig.spec.ShowConsoleLog) console.log(data)
    if (OSConfig.spec.SaveLog) appendFileSync(LogPath, data)
})
RunQemuCommand.stderr.on("data", data => {
    if (OSConfig.spec.ShowConsoleLog) console.log(data)
    if (OSConfig.spec.SaveLog) appendFileSync(LogPath, data)
})
RunQemuCommand.on("exit", code => exit(code))