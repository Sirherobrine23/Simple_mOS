const child_process = require("child_process");
const os = require("os");
const fs = require("fs");
const path = require("path");
const Main = require("./src/index");
const Command = Main.Get_Command();
const ProcessQemu = child_process.execFile(Command.command, Command.arg);
ProcessQemu.on("exit", code => process.exit(code));

const LogFile = path.resolve(os.homedir(), `DockerLog_${(new Date()).getTime()}.log`);
const LogStream = fs.createWriteStream(LogFile);
ProcessQemu.stdout.on("data", data => LogStream.write(data));
ProcessQemu.stderr.on("data", data => LogStream.write(data));

if (process.env.LOG_DEBUG === "true") {
  ProcessQemu.stdout.on("data", data => process.stdout.write(data));
  ProcessQemu.stderr.on("data", data => process.stderr.write(data));
}
console.log("QEMU Command:", Command.command, ...Command.arg);
console.log("Post Start:", ...Command.PostStart);

ProcessQemu.stdin.write(Command.PostStart.join("\n")+"\n");