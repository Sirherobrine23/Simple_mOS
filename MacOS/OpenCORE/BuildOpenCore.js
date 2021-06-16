const { resolve, join } = require("path");
const { execFileSync } = require("child_process");
const { existsSync, rmSync } = require("fs");

for (let OpenCore of [
    "Broadwell",
    "Haswell",
    "Penryn",
    "Skylake"
]){
    const Path = resolve(__dirname, OpenCore);
    const PathExec = join(Path, "opencore-image-ng.sh");
    const OpenCoreQCOMPath = join(Path, "OpenCore.qcow2")
    if (existsSync(OpenCoreQCOMPath)) rmSync(OpenCoreQCOMPath, {force: true})
    console.log(execFileSync(`sudo ${PathExec} --cfg config.plist --img OpenCore.qcow2`, {cwd: Path}).toString());
}