const { resolve, join } = require("path");
const { existsSync, readFileSync, writeFileSync, rmSync } = require("fs");
const { cpus, freemem } = require("os")
const { cwd, config } = require("process");
const { execFile, execSync, execFileSync } = require("child_process");
const yaml = {parse: require("js-yaml").load, stringify: require("js-yaml").dump};
const CurrentPath = (process.env.SAVE_FILES || cwd());

// Config
const RunQemu = []
var OSConfig = {
    Before: {
        InstallMacOS: {
            enable: true,
            system: "Catalina"
        }
    },
    cpu: {
        cores: Math.abs(cpus().length),
        threads: Math.abs(cpus().length * 2),
        sockets: 1,
        family: "Penryn",
        options: "+pcid,+ssse3,+sse4.2,+popcnt,+avx,+aes,+xsave,+xsaveopt,check",
    },
    ram: Math.trunc(((freemem() / 2) / 1024 / 1024) - 24),
    devices: {
        video: {
            type: "VGA",
            mem: 128
        },
        netdev: {
            mac: "52:54:00:c9:18:27"
        },
        hd: {
            SystemInstaller: {
                path: join(CurrentPath, "BaseSystem.img")
            },
            MacOS: {
                path: join(CurrentPath, "MacOSHDD.img"),
                size_gb: 128
            }
        }
    }
}
const osPathConfig = resolve(CurrentPath, "MacOSConfig.yaml");
if (existsSync(osPathConfig)) OSConfig = yaml.parse(readFileSync(osPathConfig, "utf8"));
else {
    console.log("Salvando as Configurações inicias");
    writeFileSync(osPathConfig, yaml.stringify(OSConfig));
    console.log("Saindo");
    process.exit(0)
}
RunQemu.push(
    `-enable-kvm -m "${OSConfig.ram}" -cpu ${OSConfig.cpu.family},kvm=on,vendor=GenuineIntel,+invtsc,vmware-cpuid-freq=on,${OSConfig.cpu.options}`,
    `-machine q35`,
    "-usb -device usb-kbd -device usb-tablet",
    `-smp "${OSConfig.cpu.threads}",cores="${OSConfig.cpu.cores}",sockets="${OSConfig.cpu.sockets}"`,
    "-device usb-ehci,id=ehci",
    `-device isa-applesmc,osk="ourhardworkbythesewordsguardedpleasedontsteal(c)AppleComputerInc"`,
    `-drive if=pflash,format=raw,readonly,file="${resolve(__dirname, "OSX-KVM/OVMF_CODE.fd")}"`,
    `-drive if=pflash,format=raw,file="${resolve(__dirname, "OSX-KVM/OVMF_VARS-1024x768.fd")}"`,
    "-smbios type=2",
    "-device ich9-intel-hda -device hda-duplex",
    "-device ich9-ahci,id=sata",
    `-drive id=OpenCoreBoot,if=none,snapshot=on,format=qcow2,file="${resolve(__dirname, "OSX-KVM/OpenCore-Catalina/OpenCore.qcow2")}"`,
    "-device ide-hd,bus=sata.2,drive=OpenCoreBoot",
    "-device ide-hd,bus=sata.3,drive=InstallMedia",
    `-drive id=MacHDD,if=none,file="${OSConfig.devices.hd.MacOS.path}",format=qcow2`,
    "-device ide-hd,bus=sata.4,drive=MacHDD",
    `-netdev user,id=net0 -device vmxnet3,netdev=net0,id=net0,mac=${OSConfig.devices.netdev.mac}`,
    "-monitor stdio"
)

// Video
if (OSConfig.devices.video.type.toLocaleLowerCase() === "vga") RunQemu.push(`-device VGA,vgamem_mb=${OSConfig.devices.video.mem || 128}`);
else {
    console.log("Starting MacOS with vnc on all network interfaces")
    RunQemu.push("-vnc 0.0.0.0:0")
}

// Check and create the file if it doesn't exist.
if (!(existsSync(OSConfig.devices.hd.MacOS.path))) execFileSync("qemu-img",["create", "-f", "qcow2", OSConfig.devices.hd.MacOS.path, `${OSConfig.devices.hd.MacOS.size_gb}G`]);


(async function(){
    if (OSConfig.Before.InstallMacOS.enable === true) {
        if (existsSync(OSConfig.devices.hd.SystemInstaller.path)) rmSync(OSConfig.devices.hd.SystemInstaller.path, {force: true})
        if (existsSync(join(CurrentPath, "BaseSystem.dmg"))) rmSync(join(CurrentPath, "BaseSystem.dmg"), {force: true})
        if (existsSync(join(CurrentPath, "BaseSystem.chunklist"))) rmSync(join(CurrentPath, "BaseSystem.chunklist"), {force: true})
        execFileSync(resolve(__dirname, "./OSX-KVM/fetch-macOS-v2.py"), ["--action", "download", "--os-type", (function(){if (OSConfig.Before.InstallMacOS.system === "default" || OSConfig.Before.InstallMacOS.system === "latest") return OSConfig.Before.InstallMacOS.system; else return "default"})(), "--outdir", CurrentPath], {cwd: CurrentPath})
        RunQemu.push(`-drive id=InstallMedia,if=none,file="${OSConfig.devices.hd.SystemInstaller.path}",format=raw`);
    }
    
    // Run Qemu
    console.log("qemu-system-x86_64", RunQemu);
    const run = execFile("qemu-system-x86_64", RunQemu);
    run.stdout.on("data", d => console.log(d))
    run.stderr.on("data", d => console.log(d))
})()