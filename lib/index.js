const { execSync } = require("child_process");
const { readFileSync } = require("fs");

module.exports = {
    kvm: function(){
        const LoadModules = execSync("lsmod").toString().split("\n").filter(_d => {return (_d.includes("kvm", "amd_iommu", "intel_iommu"));}).length
        const CpuInfo = readFileSync("/proc/cpuinfo", "utf8").toString().split("\n").filter(_n => {return (_n.includes("vmx", "svm"))}).length
        return (LoadModules >= 1 && CpuInfo >= 1)
    },
}