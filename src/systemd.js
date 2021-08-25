const os = require("os");
const child_process = require("child_process");
const path = require("path");
const SystemDFile = "/etc/systemd/system/MacOSStart.service";


function CreateSystemD() {
    const File = [
        "[Unit]",
        "Description=MacOS Start with SystemD",
        "After=network-online.target",
        "Wants=network-online.target",
        "StartLimitIntervalSec=0",
        "",
        "[Service]",
        "Type=simple",
        "Restart=always",
        "RestartSec=5s",
        `User=${os.userInfo().username}`,
        `ExecStart=/usr/bin/node "${path.resolve(__dirname, "../index.js")}"`,
        `SyslogIdentifier=MacKVM`,
        "",
        "[Install]",
        "WantedBy=multi-user.target"
    ];
    // Write file with sudo
    child_process.execSync(`echo '${File.join("\n")}' | sudo tee "${SystemDFile}"`);
    // Show Path of file
    console.log(">:", SystemDFile);
    // Restart systemd
    child_process.execSync("sudo systemctl daemon-reload");
    // Enable service
    child_process.execSync(`sudo systemctl enable ${path.basename(SystemDFile)}`);
    return File.join("\n");
}

const RemoveSystemD = () => {
    child_process.execSync(`sudo systemctl disable ${path.basename(SystemDFile)}`);
    child_process.execSync(`sudo rm ${SystemDFile}`);
    child_process.execSync("sudo systemctl daemon-reload");
    return true;
}

module.exports = CreateSystemD;
module.exports.RemoveSystemD = RemoveSystemD;