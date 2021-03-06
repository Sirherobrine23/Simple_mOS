const os = require("os");
const child_process = require("child_process");
const path = require("path");
const fs = require("fs");
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
    // Write file
    const TempFile = path.resolve(os.tmpdir(), `MacKVM.service`);
    fs.writeFileSync(TempFile, File.join("\n"), "utf8");
    // Copy file
    child_process.execSync(`sudo cp -f "${TempFile}" "${SystemDFile}"`);
    console.log(TempFile, "->", SystemDFile);
    // Restart systemd
    child_process.execSync("sudo systemctl daemon-reload");
    // Enable service
    child_process.execSync(`sudo systemctl enable ${path.basename(SystemDFile)}`);
    return true;
}

const RemoveSystemD = () => {
    child_process.execSync(`sudo systemctl disable ${path.basename(SystemDFile)}`);
    child_process.execSync(`sudo rm ${SystemDFile}`);
    child_process.execSync("sudo systemctl daemon-reload");
    return true;
}

module.exports = CreateSystemD;
module.exports.RemoveSystemD = RemoveSystemD;