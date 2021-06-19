const { resolve, join } = require("path");
const { exec } = require("child_process");
const { existsSync, rmSync, mkdirSync, writeFileSync, appendFileSync } = require("fs");
const { exit } = require("process");

const LogPath = join(__dirname, "log/")
if (!(existsSync(LogPath))) mkdirSync(LogPath);

for (let OpenCore of [
    "Broadwell",
    "Haswell",
    "Penryn",
    "Skylake"
]){
    const OpenCORELogPath = join(LogPath, `${OpenCore}.log`)
    writeFileSync(OpenCORELogPath, "")
    const Path = resolve(__dirname, OpenCore);
    const PathExec = join(Path, "opencore-image-ng.sh");
    const OpenCoreQCOMPath = join(Path, "OpenCore.qcow2")
    if (existsSync(OpenCoreQCOMPath)) rmSync(OpenCoreQCOMPath, {force: true})
    
    const Exec = exec(`sudo bash ${PathExec} --cfg config.plist --img OpenCore.qcow2`, {cwd: Path});
    function log(data = ""){data.split("\n").filter(d=>{return (!(d === "" || d === " "))}).forEach(d=>console.log(`${OpenCore} log: ${d}`)); appendFileSync(OpenCORELogPath, data)}
    Exec.stdout.on("data", d=>log(d))
    Exec.stderr.on("data", d=>log(d))
    Exec.on("exit", c => {log(`code exit: ${c}`);exit(c)})
}