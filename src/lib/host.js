const fs = require("fs");
const { execSync } = require("child_process");

// Load Modules to WSL2
const WSL2_Modules = () => execSync("modprobe kvm_intel").toString();

// Detect WSL2
const Detect_WSL2 = () => /WSL2|wsl2/gi.test(execSync("uname -r").toString());

// Check KVM
function Detect_kvm() {
  if (process.platform === "linux") {
    const cpu_info = fs.readFileSync("/proc/cpuinfo", "utf8");
    const Kernel_uname = execSync("uname -r").toString();
    // Virtualization
    if (/vmx|svm/gi.test(cpu_info)) {
      if (/sse4_1/gi.test(cpu_info)) {
        if (/avx/gi.test(cpu_info)) return true;
      }
    }
    // Detect is WSl 2
    else if (/WSL2|wsl2/gi.test(Kernel_uname)) {
      WSL2_Modules();
      return true;
    }
    // Run kvm-ok
    else try {execSync("kvm-ok"); return true;} catch (err){}
  } else if (process.platform === "win32") {}
  return false;
}

module.exports = {
  Detect_kvm,
  WSL2_Modules,
  Detect_WSL2
}