const { resolve, join } = require("path");
const { exec } = require("child_process");
const { existsSync, rmSync, mkdirSync, writeFileSync, appendFileSync } = require("fs");
const { exit } = require("process");
const argv = require("minimist")(process.argv.slice(2));

const LogPath = join(__dirname, "log/")
if (!(existsSync(LogPath))) mkdirSync(LogPath);
const Chips = []

if (argv.b) Chips.push("Broadwell")
if (argv.h) Chips.push("Haswell")
if (argv.p) Chips.push("Penryn")
if (argv.S) Chips.push("Skylake")
if (Chips.length <= 0) exit(1)
for (let OpenCore of Chips){
    const OpenCORELogPath = join(LogPath, `${OpenCore}.log`)
    writeFileSync(OpenCORELogPath, "")
    const Path = resolve(__dirname, OpenCore);
    const PathExec = join(__dirname, "opencore-image-ng.sh");
    const OpenCoreQCOMPath = join(Path, "OpenCore.qcow2")
    if (existsSync(OpenCoreQCOMPath)) rmSync(OpenCoreQCOMPath, {force: true})
    
    const Exec = exec(`sudo bash ${PathExec} --cfg config.plist --img "${OpenCoreQCOMPath}" --chi ${OpenCore}`, {cwd: Path});
    function log(data = ""){data.split("\n").filter(d=>{return (!(d === "" || d === " "))}).forEach(d=>console.log(`${OpenCore} log: ${d}`)); appendFileSync(OpenCORELogPath, data)}
    Exec.stdout.on("data", d=>log(d))
    Exec.stderr.on("data", d=>log(d))
    Exec.on("exit", c => {
        log(`code exit: ${c}`);
        if (c !== 0) return exit(c)
        
    })
}