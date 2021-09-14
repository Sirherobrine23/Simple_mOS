const child_process = require("child_process");
const os = require("os");

// Defaults
const VM_MAC_Address = "52:54:00:c9:18:27"

async function Bridge (){
    const Bridge_Interface = {
        ip: "192.168.10.0",
        mask: "255.255.255.0",
        name: "os_br0"
    }

    // Interface_File
    const Interface = fs.readfileSync("/etc/network/interfaces", "utf8");
    if (!(Interface.includes(Bridge_Interface.name))) {
        const FromEth = "eth0"
        const AddBridge = ([
            "",
            `# Use old ${FromEth} config for ${Bridge_Interface.name}, plus bridge stuff`,
            `iface ${Bridge_Interface.name} inet dhcp`,
            `    bridge_ports    ${FromEth}`,
            "    bridge_stp      off",
            "    bridge_maxwait  0",
            "    bridge_fd       0",
            "",
        ]).join("\n");
        const NewInterfaceConfig = Interface + AddBridge;
    }
    return [
        "-netdev", "tap,id=net0",
        "-device", `vmxnet3,netdev=net0,id=net0,mac=${VM_MAC_Address}`,
    ]
}

async function User(){
    return [
        "-netdev", "user,id=net0",
        "-device", `vmxnet3,netdev=net0,id=net0,mac=${VM_MAC_Address}`,
    ]
}

// Export
module.exports = {
    Bridge,
    User,
}