const path = require("path");
const fs = require("fs");
const os = require("os");
const cli_color = require("cli-color");
const js_yaml = require("js-yaml");

let RootPath;
if (process.env.SUDO_USER) RootPath = path.resolve("/home", process.env.SUDO_USER, ".MacOS_Storage");
else RootPath = path.resolve(os.homedir(), ".MacOS_Storage");

//  Basic Paths

// Base Config
let Config = {
    host: {
        storage_files_path: RootPath,
    },
    VM: {
        ALLOCATED_RAM: 3072, // mib size
        CPU_SOCKETS: 1,
        CPU_CORES: 2,
        CPU_THREADS: 4,
        MORE_OPTIONS: "+ssse3,+sse4.2,+popcnt,+avx,+aes,+xsave,+xsaveopt,check"
    },
    macos: {
        os: "Big Sur",
        installer: true,
    },
    disk: [
        {
            size: 50,
            file: path.resolve(RootPath, "MacOSHDD.qcow2"),
        },
        {
            device: "/dev/sdb",
            lock: false,
        }
    ],
    display: {
        type: "vnc",
        port: 5900,
        password: "",
    }
}

// Load Config if exists
const GetConfig = () => Config;
const update_host_check = (status = true) => {Config.host.install_packages = status; SaveConfig();}
const set_os = (os = "mojave") => {Config.macos.os = os; SaveConfig();}
const set_path_to_storage = (path = RootPath) => {Config.host.storage_files_path = path; SaveConfig();}
const get_path_to_storage = () => {
    if (!(fs.existsSync(Config.host.storage_files_path))) {
        console.info(cli_color.yellow("Storage path not found, creating..."));
        fs.mkdirSync(Config.host.storage_files_path);
    }
    return Config.host.storage_files_path;
}

const SettingsPath = path.resolve(get_path_to_storage(), "KVM-Settings.yaml");
if (fs.existsSync(SettingsPath)) Config = js_yaml.load(fs.readFileSync(SettingsPath, "utf8"));
const SaveConfig = () => fs.writeFileSync(SettingsPath, js_yaml.dump(Config));
// export
module.exports = GetConfig;
module.exports.update_host_check = update_host_check;
module.exports.set_os = set_os;

// Main Storage files
module.exports.set_path_to_storage = set_path_to_storage;
module.exports.get_path_to_storage = get_path_to_storage;

// Save Config
SaveConfig();
