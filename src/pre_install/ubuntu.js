const child_process = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

// Read os-release
const os_release = {};
fs.readFileSync("/etc/os-release", "utf8").split(/\n|\t/gi).map(line => {
    if (line) {
        const splited = line.split(/=/);
        return {
            input: splited[0],
            value: splited[1].replace(/^"|"$/g, ""),
        }
    } else return false;
}).filter(a => a).forEach(a => os_release[a.input] = a.value);

// Install required packages
function Packages(){
    return new Promise((resolve, reject) => {
        const UpdateRepo = child_process.exec("apt-get update");
        UpdateRepo.stdout.on("data", (data) => process.stdout.write(data));
        UpdateRepo.stderr.on("data", (data) => process.stdout.write(data));
        UpdateRepo.on("exit", async code => {
            if (code !== 0) return reject(code);
            await new Promise(resolve => setTimeout(resolve, 1000));
            const packages = child_process.exec("apt-get install -y qemu uml-utilities virt-manager git wget libguestfs-tools p7zip-full", {
                env: {
                    ...process.env,
                    DEBIAN_FRONTEND: "noninteractive"
                }
            });
            packages.stdout.on("data", (data) => process.stdout.write(data));
            packages.stderr.on("data", (data) => process.stdout.write(data));
            packages.on("exit", code => {
                if (code !== 0) return reject(code);
                resolve();
            });
        });
    });
}

const KVM_ignore_msrs = () => fs.writeFileSync("/sys/module/kvm/parameters/ignore_msrs", "1");

const IntelKVMConfig = () => {
    if (fs.existsSync("/etc/modprobe.d/kvm.conf")) return false;
    else {
        if (/[iI]ntel/gi.test(os.cpus()[0].model)) {
            const kvm_conf = fs.readFileSync(path.resolve(__dirname, "../OsxKvm_kholia/kvm.conf"), "utf8");
            fs.writeFileSync("/etc/modprobe.d/kvm.conf", kvm_conf);
            return true;
        }
        console.log("Skipping is part only Intel CPUs");
        return false;
    }
}

module.exports = async () => {
    if (parseInt(os_release.VERSION_ID) >= 20) {
        try {
            console.log("Ubuntu pre-installation");
            console.log("Installing packages");
            if (await Packages()) {
                console.log("Configuring KVM");
                if (KVM_ignore_msrs()) {
                    console.log("Configuring Intel KVM");
                    IntelKVMConfig();
                    return true;
                } else console.log("Failed to ignore MSRs");
            }
            return false;
        } catch (e) {
            console.log(e);
            return false;
        }
    } else {
        console.log("Updateto Ubuntu 20.01 or higher required");
        console.log("Use do-release-upgrade to update ubuntu");
        process.exit(1);
    }
}