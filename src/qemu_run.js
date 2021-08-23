const child_process = require("child_process");
const fs = require("fs");
const path = require("path");
const QemuConfig = require("./qemu_settings");
const fetchOS = require("./fetchOS");
const cli_color = require("cli-color");

// Check avaible VT-X/AMD SVM
if (!/vmx|svm/gi.test(fs.readFileSync("/proc/cpuinfo", "utf8"))) throw new Error("Your CPU doesn't support VT-X/AMD SVM");

// Check sse4.1
if (!/sse4_1/gi.test(fs.readFileSync("/proc/cpuinfo", "utf8"))) throw new Error("Your CPU doesn't support SSE4.1");

// check AVX
if (!/avx/gi.test(fs.readFileSync("/proc/cpuinfo", "utf8"))) console.info(cli_color.yellowBright("Your CPU doesn't support AVX, this is required to use MarcOS after MacOS Mojave"));

// Check if the user is root
if (process.getuid() !== 0) {
    console.error("Please run this script as root.");
    process.exit(1);
}

// Set Execs Global
global.QemuRuns = null;

// Start the QEMU MacOS.
function Start(){
    if (global.QemuRuns) throw new Error("QEMU is already running.");
    const Config = QemuConfig();
    // Bios User
    const OVMF_VARS_User = path.resolve(QemuConfig.get_path_to_storage(), "OVMF_VARS-1024x768.fd");
    if (!(fs.existsSync(OVMF_VARS_User))) fs.copyFileSync(path.resolve(__dirname, "./OsxKvm_kholia/OVMF_VARS-1024x768.fd"), OVMF_VARS_User);
    
    // OpenCORE
    const OpenCORE_User = path.resolve(QemuConfig.get_path_to_storage(), "OpenCore_User.qcow2");
    if (!(fs.existsSync(OpenCORE_User))) fs.copyFileSync(path.resolve(__dirname, "./OsxKvm_kholia/OpenCore-Catalina/OpenCore.qcow2"), OpenCORE_User);
    
    const Argv = [
        "-enable-kvm", "-m", `${Config.VM.ALLOCATED_RAM}`, "-cpu", `Penryn,kvm=on,vendor=GenuineIntel,+invtsc,vmware-cpuid-freq=on,${Config.VM.MORE_OPTIONS}`,
        "-machine", "q35",
        "-usb", "-device", "usb-kbd", "-device", "usb-tablet",
        "-smp", `${Config.VM.CPU_THREADS},cores=${Config.VM.CPU_CORES},sockets=${Config.VM.CPU_SOCKETS}`,
        "-device", "usb-ehci,id=ehci",
        "-device", "isa-applesmc,osk=\"ourhardworkbythesewordsguardedpleasedontsteal(c)AppleComputerInc\"",
        "-drive", `if=pflash,format=raw,readonly,file="${path.resolve(__dirname, "./OsxKvm_kholia/OVMF_CODE.fd")}"`,
        "-drive", `if=pflash,format=raw,file="${OVMF_VARS_User}"`,
        "-smbios", "type=2",
        "-device", "ich9-intel-hda -device hda-duplex",
        "-device", "ich9-ahci,id=sata",
        "-drive", `id=OpenCoreBoot,if=none,snapshot=on,format=qcow2,file="${OpenCORE_User}"`,
        "-device", "ide-hd,bus=sata.2,drive=OpenCoreBoot",
        "-netdev", "user,id=net0", "-device", "vmxnet3,netdev=net0,id=net0,mac=52:54:00:c9:18:27",
        "-monitor", "stdio"
    ];
    
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
            "-drive", `id=InstallMedia,if=none,file="${BaseSystem}",format=raw`
        );
    }

    // HD
    let SataNumber = 4
    for (let Disk of Config.disk){
        const RandomID = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        if (Disk.device) {
            if (typeof Disk.lock === "boolean") {
                try {child_process.execSync(`umount "${Disk.device}"`); console.log(`umounted ${Disk.device}`);} catch(e){}
                if (Disk.lock) {
                    Argv.push(
                        "-drive", `id=${RandomID},if=none,file="${Disk.path}",format=raw`,
                        "-device", `ide-hd,bus=sata.${SataNumber},drive=${RandomID}`
                    );
                }
            } else console.log(Disk.device, "Should be a boolean on the lock option");
        } else {
            if (!(fs.existsSync(Disk.file))) child_process.execSync(`qemu-img create -f qcow2 "${Disk.file}" ${Disk.size}G`);
            Argv.push(
                "-drive", `id=${RandomID},if=none,file="${Disk.file}",format=qcow2`,
                "-device", `ide-hd,bus=sata.${SataNumber},drive=${RandomID}`
            );
        }
        SataNumber++;
    }
    
    // Display
    const RandomPassword = Math.random().toString(36).substring(2, 6) + Math.random().toString(36).substring(2, 6);
    if (Config.display.type.toLowerCase() === "vnc") {
        if (!(Config.display.password)) console.log("VNC Password:", RandomPassword);
        Argv.push("-vnc", `:${Config.display.port || 5901},password="${Config.display.password || RandomPassword}"`);
    } else if (Config.display.type.toLowerCase() === "vga") {
        Argv.push("-device", `VGA,vgamem_mb=${Config.display.vgamem_mb}`);
    } else if (Config.display.type.toLowerCase() === "qxl") {
        Argv.push("-device", `qxl-vga,id=video0,vram_size=${Config.display.vram_size}`);
    } else {
        console.log("Display type not supported");
    }

    const VM = child_process.execFile("qemu-system-x86_64", Argv);
    global.QemuRuns = {
        VM,
        RandomPassword,
        disks: SataNumber,
    };
    return global.QemuRuns;
}

const Status = () => typeof global.QemuRuns === "object";
const VncPassword = () => global.QemuRuns.RandomPassword;

// exports
module.exports = Start;
module.exports.Status = Status;
module.exports.VncPassword = VncPassword;
