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
    if (!(fs.existsSync(OpenCORE_User))) fs.copyFileSync(path.resolve(__dirname, "./OsxKvm_kholia/OpenCore/OpenCore.qcow2"), OpenCORE_User);
    
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
    const DiskArray = Disk.Get_QEMU_Command();
    const DisplayArray = Display.Get_QEMU_Command();
    
    // CPU Options
    let OptionsCPU = "";
    if (Config.CPU.QemuOptions.length > 0) OptionsCPU = "," + Config.CPU.QemuOptions.join(",");
    let Threads = Config.CPU.Threads;
    let Cores = Config.CPU.Cores;
    let CPUSockets = Config.CPU.Sockets;
    let NetworkMAC = Config.Network.MAC;
    let CPUModel = Config.CPU.Model;
    if (process.env.ISDOCKER === "true") {
        RAM_MEMORY = parseInt(os.freemem() / (1024 * 1024))
        Threads = Cores = os.cpus().length;
        CPUSockets = 1;
        // if (((Threads / 2) % 2) === 0) CPUSockets = Threads / 2;
        const NetworkInterfaces = os.networkInterfaces();
        NetworkMAC = NetworkInterfaces[Object.keys(NetworkInterfaces).filter(key => NetworkInterfaces[key][0].internal === false)[0]][0].mac;
        if (/[Ii]ntel/gi.test(os.cpus()[0].model)) CPUModel = "host";

        console.log("");
        console.log("RAM MEMORY:", RAM_MEMORY);
        console.log("Threads:", Threads);
        console.log("Cores:", Cores);
        console.log("CPU Sockets:", CPUSockets);
        console.log("Network MAC:", NetworkMAC);
        console.log("CPU Model:", CPUModel);
        console.log("");
    }
    
    // QEMU Config
    Argv.push(
        // VM Basic info
        "-enable-kvm", "-m", `${RAM_MEMORY}`, "-cpu", `${CPUModel || "Penryn"},kvm=on,vendor=GenuineIntel,+invtsc,vmware-cpuid-freq=on${OptionsCPU}`,
        "-machine", "q35,accel=kvm,kernel-irqchip=split",
        "-smp", `${Threads},cores=${Cores},sockets=${CPUSockets}`,
        // USB Controller
        "-usb",
        // "-device", "qemu-xhci",
        "-device", "usb-kbd",
        "-device", "usb-tablet",
        // BIOS
        "-device", "isa-applesmc,osk=ourhardworkbythesewordsguardedpleasedontsteal(c)AppleComputerInc",
        "-drive", `if=pflash,format=raw,readonly=on,file=${path.resolve(__dirname, "./OsxKvm_kholia/OVMF_CODE.fd")}`,
        "-drive", `if=pflash,format=raw,file=${OVMF_VARS_User}`,
        "-smbios", "type=2",
        // Internet interface
        "-netdev", "user,id=net0",
        "-device", `vmxnet3,netdev=net0,id=net0,mac=${NetworkMAC || "52:54:00:c9:18:27"}`,
        // "-device", `virtio-net-pci,netdev=net0,id=net0,mac=${Config.Network.MAC || "52:54:00:c9:18:27"}`,
        // Sound
        "-device", "intel-hda", "-device", "hda-duplex",
        // Disks
        ...DiskArray,
        // Monitor Adapter
        "-monitor", "stdio",
        "-vnc", ":1,password=on",
        ...DisplayArray.Command,
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