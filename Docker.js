const child_process = require("child_process");
const Main = require("./src/index");
const Command = Main.Get_Command();
const ProcessQemu = child_process.execFile(Command.command, Command.arg);
ProcessQemu.stdout.on("data", data => process.stdout.write(data));
ProcessQemu.stderr.on("data", data => process.stderr.write(data));
ProcessQemu.on("exit", code => process.exit(code));
ProcessQemu.stdin.write(Command.PostStart.join("\n")+"\n");
console.log(Command.PostStart.join("\n")+"\n");