const os = require("os");
const path = require("path");
const fs = require("fs");
const detect_host = require("./host");

let _path =  path.join(os.homedir(), ".Simples_mOS");
if (detect_host.Detect_WSL2()) _path = path.join("/mnt/c/Simples_mOS_Files");

if (!(fs.existsSync(_path))) fs.mkdirSync(_path, {recursive: true});
module.exports = _path
module.exports.Storage_Files_Path = _path;