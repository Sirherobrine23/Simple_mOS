const { resolve, join } = require("path");
const { existsSync, readFileSync, writeFileSync, rmSync, copyFileSync, appendFile, appendFileSync } = require("fs");
const { cpus, freemem, tmpdir } = require("os")
const { cwd, exit } = require("process");
const { exec, spawnSync, execSync } = require("child_process");

const yaml = {parse: require("js-yaml").load, stringify: require("js-yaml").dump};
const ConfigsQemu = require("./MacOS/configs_valids.json")
const CurrentPath = (process.env.SAVE_FILES || cwd());

// Config
const RunQemu = []
var OSConfig = {
    Before: {
        InstallMacOS: {
            enable: true,
            removeFiles: true,
            system: 3,
            SystemBasePath: join(CurrentPath, "BaseSystem.img")
        }
    },
    cpu: {
        cores: Math.abs(cpus().length),
        threads: Math.abs(cpus().length * 2),
        sockets: 1,
        family: "Penryn",
        options: "+pcid,+ssse3,+sse4.2,+popcnt,+avx,+aes,+xsave,+xsaveopt,check"
    },
    ram: Math.trunc(((freemem() / 2) / 1024 / 1024) - 24),
    qemu: {
        log: false,
        logfile: true
    },
    devices: {
        video: {
            type: "VGA",
            mem: 128
        },
        netdev: {
            mac: "52:54:00:c9:18:27"
        },
        hd: [
            {
                PATH: join(CurrentPath, "MacOSHDD.img"),
                TYPE: "qcow2",
                QEMU_ID: "MacHDD",
                SATA_ID: 4,
                SIZE_GB: 128
            }
        ]
    }
}

if (ConfigsQemu.cpu[OSConfig.cpu.family].ram >= OSConfig.ram) OSConfig.ram = ConfigsQemu.cpu[OSConfig.cpu.family].ram
if (ConfigsQemu.cpu[OSConfig.cpu.family].core >= OSConfig.cpu.cores) OSConfig.cpu.cores = ConfigsQemu.cpu[OSConfig.cpu.family].core
if (ConfigsQemu.cpu[OSConfig.cpu.family].threads >= OSConfig.cpu.threads) OSConfig.cpu.threads = ConfigsQemu.cpu[OSConfig.cpu.family].threads

const osPathConfig = resolve(CurrentPath, "MacOSConfig.yaml");
if (existsSync(osPathConfig)) OSConfig = yaml.parse(readFileSync(osPathConfig, "utf8"));
else {
    console.log("Saving Initial Settings, please edit the MacOSConfig.yaml file");
    writeFileSync(osPathConfig, yaml.stringify(OSConfig));
    console.log("Going out");
    process.exit(0)
}

const Opencore_Path = resolve(__dirname, "MacOS/OpenCORE", OSConfig.cpu.family);
const BiosBootPath = resolve(__dirname, "MacOS/PFLASH")

RunQemu.push(
    `-enable-kvm -m "${OSConfig.ram}" -cpu ${ConfigsQemu.cpu[OSConfig.cpu.family].cpu_name},kvm=on,vendor=GenuineIntel,+invtsc,vmware-cpuid-freq=on,"${OSConfig.cpu.options}"`,
    `-machine q35`,
    "-usb -device usb-kbd -device usb-tablet",
    `-smp "${OSConfig.cpu.threads}",cores="${OSConfig.cpu.cores}",sockets="${OSConfig.cpu.sockets}"`,
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
    `-netdev user,id=net0 -device vmxnet3,netdev=net0,id=net0,mac=${OSConfig.devices.netdev.mac}`,
    "-monitor stdio"
)

console.log("\n\n------------- Storage");
// Storage
for (let _HDD of OSConfig.devices.hd){
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
if (OSConfig.devices.video.type.toLocaleLowerCase() === "vga") RunQemu.push(`-device VGA,vgamem_mb=${OSConfig.devices.video.mem || 128}`);
else {
    console.log("Starting MacOS with vnc on all network interfaces")
    RunQemu.push("-vnc 0.0.0.0:0")
}

if (OSConfig.Before.InstallMacOS.enable === true) {
    if (OSConfig.Before.InstallMacOS.removeFiles){
        if (existsSync(OSConfig.Before.InstallMacOS.SystemBasePath)) rmSync(OSConfig.Before.InstallMacOS.SystemBasePath, {force: true})
    }
    console.log("Downloading BaseSystem.dmg");
    // console.log("---------------------------------\n\n");
    const VersionDownload = (function(){
        const _D = OSConfig.Before.InstallMacOS.system
        if (typeof _D === "number") return _D;
        const MacProducts = JSON.parse(readFileSync("./MacOS/products.json", "utf8"))
        for (let index in MacProducts) {
            const element = MacProducts[index];
            index = parseInt(index)
            const nameRequire = OSConfig.Before.InstallMacOS.system.toString().toLocaleLowerCase()
            if (element.name.toLocaleLowerCase().includes(nameRequire)) return index + 1
        }
        return 0
    })()

    var _DDownloadMac = execSync(`python3 ${resolve(__dirname, "MacOS/FetchOS.py")} --action download --os-type default --select ${VersionDownload} --outdir ${tmpdir()}`, {cwd: CurrentPath}).toString()
    _DDownloadMac = _DDownloadMac.split("\n").filter(_DD => {return (_DD.includes("MacOS Download Version: "))}).join("\n")
    console.log(_DDownloadMac);

    console.log("Converting from dmg to img");
    
    const __MacDMGConvert = execSync(`qemu-img convert BaseSystem.dmg -O raw ${OSConfig.Before.InstallMacOS.SystemBasePath}`, {cwd: tmpdir()}).toString()
    // console.log(__MacDMGConvert);
    
    // -
    rmSync(join(tmpdir(), "BaseSystem.dmg"), {force: true})
    rmSync(join(tmpdir(), "BaseSystem.chunklist"), {force: true})
    // -
    RunQemu.push(
        "-device ide-hd,bus=sata.3,drive=InstallMedia",
        `-drive id=InstallMedia,if=none,file="${OSConfig.Before.InstallMacOS.SystemBasePath}",format=raw`
    );
}

// Run Qemu
console.log("starting qemu");
const CommandExec = `qemu-system-x86_64 ${RunQemu.join(" ")}`
const RunQemuCommand = exec(CommandExec, {cwd: CurrentPath});

const LogPath = join(CurrentPath, "KVMQemu.log")
if (OSConfig.qemu.logfile) writeFileSync(LogPath, `Command Exec: ${CommandExec}\n\n`)
RunQemuCommand.stdout.on("data", data => {
    if (OSConfig.qemu.log) console.log(data)
    if (OSConfig.qemu.logfile) appendFileSync(LogPath, data)
})
RunQemuCommand.stderr.on("data", data => {
    if (OSConfig.qemu.log) console.log(data)
    if (OSConfig.qemu.logfile) appendFileSync(LogPath, data)
})


RunQemuCommand.on("exit", code => exit(code))