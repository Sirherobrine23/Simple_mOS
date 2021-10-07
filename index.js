#!/usr/bin/env node
const child_process = require("child_process");
const fs = require("fs");
const path = require("path");
const inquirer = require("inquirer");
const ProcessArg = require("minimist")(process.argv.slice(2));

// Import src/index.js
const Simples_mOS = require("./src/index");

// Start Command
function Start() {
  const Command = Simples_mOS.Get_Command();
  const ProcessCommand = child_process.execFile(Command.command, Command.arg);
  ProcessCommand.stdout.on("data", (data) => process.stdout.write(data));
  ProcessCommand.stderr.on("data", (data) => process.stdout.write(data));
  ProcessCommand.on("exit", code => process.exit(code));
  setTimeout(() => Command.PostStart.forEach(Command => ProcessCommand.stdin.write(Command+"\n")), 1000);
  return ProcessCommand;
}

async function Interactive() {

}

console.log(ProcessArg);
if (ProcessArg["no_interactive"]) Start();
else Interactive();