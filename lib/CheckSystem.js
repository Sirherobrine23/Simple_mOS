const { execSync } = require("child_process");
const { readFileSync } = require("fs");
if (process.platform === "linux" || process.platform === "android") {
    console.log(execSync("lsb_release -a 2>/dev/null").toString("ascii"));
    console.log(execSync("uname -a 2>/dev/null").toString("ascii"));
    const LoadModules = execSync("lsmod").toString().split("\n").filter(_d => {return (_d.includes("kvm", "amd_iommu", "intel_iommu"));})
    const KVMInfo = readFileSync("/proc/cpuinfo", "utf8").toString().split("\n").filter(_n => {return (_n.includes("vmx", "svm"))}).length
    console.log(`KVM: -> ${KVMInfo} <- This Number must be different from 0`);
    if (LoadModules.length >= 1 && KVMInfo !== 0) {console.log(LoadModules);require("./InstallPrerequesists").Load();}
    else {
        const str = execSync("uname -r").toString("ascii");
        switch (true) {
            // amazon aws EC2
            case /aws/.test(str):
                return console.log("AWS virtual machines do not work with KVM");

            // Windows WSL
            case /[mM]icrosoft/.test(str):
                return console.log("Use WSL2");

            // Azure Virtual Machinime (VM)
            case /[aA]zure/.test(str):
                return console.log("Azure virtual machines only series ending with \"_v3\", eg Standard_D8s_v3, Standard_D2s_v3, etc ...");

            // Google Cloud Virtual Machinime (VM)
            case /[gG]cp/.test(str):
                return console.log("Google Cloud machines have not been tested yet!!");

            // Oracle cloud Virtual Machinime (VM)
            case /[oO]racle/.test(str):
                console.log("Oracle Cloud virtual machines");
                console.log("VM with arm don't work");
                return console.log("vms with amd/intel, still in testing");

            // Others Kernels
            default:
                return console.log("Check your Kernel for KVM support");
        }
    }
} else throw "Linux"
