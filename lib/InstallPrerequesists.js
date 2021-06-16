const { execSync } = require("child_process");

function CommandE(command){
    try {return execSync(`command -v "${command}"`).toString("utf8")} catch (error) {return false}
}

function Install(){
    // QEMU
    if (CommandE("qemu-system-x86_64")) console.log("Qemu Installed");
    else {
        console.log("Installing QEMU");
        if (CommandE("apt")) {
            execSync("sudo apt install -y qemu");
            if (process.arch !== "x64") execSync("sudo apt install -y qemu-system")
        }
    }

    // Python
    if (CommandE("python")) console.log("Python Installed");
    else {
        console.log("Installing Python");
        if (CommandE("apt")) {
            execSync("sudo apt install -y python");
        }
    }

    // Virt-Manager
    if (CommandE("virt-manager")) console.log("Virt-Manager Installed");
    else {
        console.log("Installing Virt-Manager");
        if (CommandE("apt")) {
            execSync("sudo apt install -y virt-manager");
        }
    }


}

module.exports = {
    Load: function() {
        if (process.platform === "linux") Install();
        else if (process.platform === "android") Install();
        else throw new Error("Only linux and android systems are supported")
    }
}