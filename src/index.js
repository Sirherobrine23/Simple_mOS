const child_process = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const KVM_lib = require("./lib/host");
const convert_units = require("convert-units");

// Import New functions
const PathControl = require("./lib/Storage_Files_Path");
const Disk = require("./Disk/index");
const Display = require("./Display/index");
const VM_Config = require("./VM/index");

// Check avaible system virtualization
if (!(KVM_lib.Detect_kvm())) throw new Error("Current hardware does not support the requirements to run MacOS on KVM");

function Start(){
    const Config = VM_Config.GetConfig();
    // Bios User
    const OVMF_VARS_User = path.resolve(PathControl, "OVMF_VARS-1024x768.fd");
    if (!(fs.existsSync(OVMF_VARS_User))) fs.copyFileSync(path.resolve(__dirname, "./OsxKvm_kholia/OVMF_VARS-1024x768.fd"), OVMF_VARS_User);
    
    // OpenCORE
    const OpenCORE_User = Disk.GetConfig().opencore_bootloader.path;
    if (!(fs.existsSync(OpenCORE_User))) fs.copyFileSync(path.resolve(__dirname, "./OsxKvm_kholia/OpenCore-Catalina/OpenCore.qcow2"), OpenCORE_User);
    
    let RAM_MEMORY = Config.ram_memory;
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
    if (Config.CPU.QemuOptions.length > 0) OptionsCPU = "," + Config.CPU.QemuOptions.join(","); else OptionsCPU = ""

    const DiskArray = Disk.Get_QEMU_Command();
    const DisplayArray = Display.Get_QEMU_Command();

    // QEMU Config
    Argv.push(
        // VM Basic info
        "-enable-kvm", "-m", `${RAM_MEMORY}`, "-cpu", `${Config.CPU.Model || "Penryn"},kvm=on,vendor=GenuineIntel,+invtsc,vmware-cpuid-freq=on${OptionsCPU}`,
        "-machine", "q35,accel=kvm",
        "-smp", `${Config.CPU.Threads},cores=${Config.CPU.Cores},sockets=${Config.CPU.Sockets}`,
        // USB Controller
        "-usb",
        "-device", "usb-kbd",
        "-device", "usb-tablet",
        // BIOS
        "-device", "isa-applesmc,osk=ourhardworkbythesewordsguardedpleasedontsteal(c)AppleComputerInc",
        "-drive", `if=pflash,format=raw,readonly,file=${path.resolve(__dirname, "./OsxKvm_kholia/OVMF_CODE.fd")}`,
        "-drive", `if=pflash,format=raw,file=${OVMF_VARS_User}`,
        "-smbios", "type=2",
        // Internet interface
        "-netdev", "user,id=net0",
        "-device", `vmxnet3,netdev=net0,id=net0,mac=${Config.Network.MAC || "52:54:00:c9:18:27"}`,
        // Sound
        "-soundhw", "hda",
        // Disks
        ...DiskArray,
        // Monitor Adapter
        ...DisplayArray.Command
    );

    return {
        command: MainCommand,
        arg: Argv,
        PostStart: [
            DisplayArray.VncCommand,
        ]
    };
}

// exports
module.exports.Get_Command = Start;