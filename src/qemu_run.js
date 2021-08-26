const child_process = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const QemuConfig = require("./qemu_settings");
const fetchOS = require("./fetchOS");
const cli_color = require("cli-color");
const convert_units = require("convert-units");

// Check avaible VT-X/AMD SVM
if (!/vmx|svm/gi.test(fs.readFileSync("/proc/cpuinfo", "utf8"))) throw new Error("Your CPU doesn't support VT-X/AMD SVM");

// Check sse4.1
if (!/sse4_1/gi.test(fs.readFileSync("/proc/cpuinfo", "utf8"))) throw new Error("Your CPU doesn't support SSE4.1");

// check AVX
if (!/avx/gi.test(fs.readFileSync("/proc/cpuinfo", "utf8"))) console.info(cli_color.yellowBright("Your CPU doesn't support AVX, this is required to use MarcOS after MacOS Mojave"));
// Set Execs Global
global.QemuRuns = null;

// Start the QEMU MacOS.
function Start(){
    for (let command of child_process.execSync("ps -aux").toString("utf8").split(/\n/gi).filter(d => !/USER\s+/.test(d) || d).map(line =>{let _line = `${line}`.split(/\s+/);return {pid: parseInt(_line[1]), mem: _line[3], command: _line.reverse().slice(0, _line.length - 10).reverse()}}).filter(a => a.command.includes("qemu-system-x86_64"))) {
        console.log("Command:", command.command, "pid:", command.pid);
        child_process.execSync(`sudo kill -9 ${command.pid}`);
    };
    const Config = QemuConfig();
    // Bios User
    const OVMF_VARS_User = path.resolve(QemuConfig.get_path_to_storage(), "OVMF_VARS-1024x768.fd");
    if (!(fs.existsSync(OVMF_VARS_User))) fs.copyFileSync(path.resolve(__dirname, "./OsxKvm_kholia/OVMF_VARS-1024x768.fd"), OVMF_VARS_User);
    
    // OpenCORE
    const OpenCORE_User = path.resolve(QemuConfig.get_path_to_storage(), "OpenCore_User.qcow2");
    if (!(fs.existsSync(OpenCORE_User))) fs.copyFileSync(path.resolve(__dirname, "./OsxKvm_kholia/OpenCore-Catalina/OpenCore.qcow2"), OpenCORE_User);
    
    let RAM_MEMORY = Config.VM.ALLOCATED_RAM;
    // Memory free with percentage
    if (typeof RAM_MEMORY === "string") {
        if (RAM_MEMORY.includes("%")) {
            // Calc
            const UserPor = Math.abs(parseInt(RAM_MEMORY.replace("%", "")));
            const Por = convert_units(os.freemem() / UserPor).from("Kb").to("MB") / 1.5
            RAM_MEMORY = Por;
            RAM_MEMORY = parseInt(RAM_MEMORY);
            console.log("Total ram in Mb:", RAM_MEMORY);
            console.log("Total ram in Gb:", parseInt(convert_units(RAM_MEMORY).from("Mb").to("Gb")));
        }
    }
    
    const Argv = [];
    // Require sudo
    let MainCommand = "qemu-system-x86_64"
    if (process.getuid() !== 0) {
        Argv.push(MainCommand);
        MainCommand = "sudo"
    }

    // Check low ram memory
    if (RAM_MEMORY <= 3000) throw new Error("Low ram Memory");

    // CPU Options
    let OptionsCPU
    if (Config.VM.MORE_OPTIONS) OptionsCPU = `,${Config.VM.MORE_OPTIONS}`; else OptionsCPU = ""

    // QEMU Config
    Argv.push(
        // VM Basic info
        "-enable-kvm", "-m", `${RAM_MEMORY}`, "-cpu", `${Config.VM.CPU_MODEL || "Penryn"},kvm=on,vendor=GenuineIntel,+invtsc,vmware-cpuid-freq=on${OptionsCPU}`,
        "-machine", "q35,accel=kvm",
        "-smp", `${Config.VM.CPU_THREADS},cores=${Config.VM.CPU_CORES},sockets=${Config.VM.CPU_SOCKETS}`,
        // USB Controller
        "-usb",
        "-device", "usb-kbd",
        "-device", "usb-tablet",
        // BIOS
        "-device", "isa-applesmc,osk=ourhardworkbythesewordsguardedpleasedontsteal(c)AppleComputerInc",
        "-drive", `if=pflash,format=raw,readonly,file=${path.resolve(__dirname, "./OsxKvm_kholia/OVMF_CODE.fd")}`,
        "-drive", `if=pflash,format=raw,file=${OVMF_VARS_User}`,
        "-smbios", "type=2",
        // Sata Controller
        "-device", "ich9-intel-hda",
        "-device", "hda-duplex",
        "-device", "ich9-ahci,id=sata",
        // OpenCore Bootloader
        "-drive", `id=OpenCoreBoot,if=none,snapshot=on,format=qcow2,file=${OpenCORE_User}`,
        "-device", "ide-hd,bus=sata.2,drive=OpenCoreBoot",
        // Internet interface
        "-netdev", "user,id=net0",
        "-device", "vmxnet3,netdev=net0,id=net0,mac=52:54:00:c9:18:27",
        // Sound
        "-soundhw", "hda",
        // Monitor Adapter
        "-monitor", "stdio",
        "-device",
        "virtio-gpu-pci,virgl=on", // 14MB
        // "virtio-vga,virgl=on", // 7MB
        // "vmware-svga", // 7MB
        // "qxl-vga", // 7MB
    );
    
    // MacOS Installer
    if (Config.macos.installer) {
        // Fetch Base System
        const BaseSystem = path.resolve(QemuConfig.get_path_to_storage(), "BaseSystem.qcow2");
        const OSDMG = fetchOS(Config.macos.os.toLowerCase());

        // Convert to qcow2
        if (fs.existsSync(BaseSystem)) fs.rmSync(BaseSystem);
        child_process.execSync(`qemu-img convert -O qcow2 "${OSDMG.System}" "${BaseSystem}"`);

        // Add Base System
        Argv.push(
            "-device", "ide-hd,bus=sata.3,drive=InstallMedia",
            "-drive", `id=InstallMedia,if=none,file=${BaseSystem},format=qcow2`,
        );
    }

    // HD
    let SataNumber = 5;
    for (let Disk of Config.disk){
        const RandomID = (Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)).replace(/[0-9]/gi, "")
        if (Disk.device) {
            try {child_process.execSync(`umount "${Disk.device}"`);console.log(`umounted ${Disk.device}`);} catch(e){console.log(cli_color.redBright(`${Disk.device} is not mounted`))}
            Argv.push(
                "-drive", `id=${RandomID},if=none,file=${Disk.device},format=raw`,
                "-device", `ide-hd,bus=sata.${SataNumber},drive=${RandomID}`
            ); 
        } else {
            if (!(fs.existsSync(Disk.file))) child_process.execSync(`qemu-img create -f qcow2 "${Disk.file}" ${Disk.size}G`);
            Argv.push(
                "-drive", `id=${RandomID},if=none,file=${Disk.file},format=qcow2`,
                "-device", `ide-hd,bus=sata.${SataNumber},drive=${RandomID}`
            );
        }
        SataNumber++;
    }
    
    // Display
    const RandomPassword = Math.random().toString(36).substring(2, 6) + Math.random().toString(36).substring(2, 6);
    if (Config.display.type.toLowerCase() === "vnc") {
        if (!(Config.display.password)) console.log("VNC Password:", RandomPassword);
        Argv.push("-vnc", `:${Config.display.port || 1},password=on`);
    } else {
        console.log("Display type not supported");
    }
    console.log("\n\n");
    console.log(MainCommand, Argv.join(" "));
    console.log("\n\n");
    const VM = child_process.execFile(MainCommand, Argv);
    global.QemuRuns = {
        VM,
        RandomPassword,
        disks: SataNumber,
    };
    if (Config.display.type.toLowerCase() === "vnc") {
        console.log("VNC Password:", Config.display.password || RandomPassword);
        console.log("VNC Port:", Config.display.port || 1);
        VM.stdin.write(`change vnc password ${Config.display.password || RandomPassword}\n`)
    }
    return global.QemuRuns;
}

const Status = () => typeof global.QemuRuns === "object";
const VncPassword = () => global.QemuRuns.RandomPassword;

// exports
module.exports = Start;
module.exports.Status = Status;
module.exports.VncPassword = VncPassword;
