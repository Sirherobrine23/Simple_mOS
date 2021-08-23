#!/usr/bin/env node
const path = require("path");
const readline = require("readline-sync");
const QEMURUN = require("./src/qemu_run");
const KVM_Config = require("./src/qemu_settings");
const cli_arg = require("minimist")(process.argv.slice(2));
const PackageJSon = require("./package.json");
const cli_color = require("cli-color");
(async () => {
    // help
    if (cli_arg.h || cli_arg.help) {
        const help = [
            "Usage: OSX_QEMU [options]",
            "Options:",
            "  -h, --help                          output usage information",
            "  -v, --version                       output the version number",
            "  -o, --os                            select MacOS version, example: Mojave",
            "  -p, --path                          select path to storage you files",
            "  -s, --setup                         setup host to run qemu and kvm (Still need a kvm compatible system)",
        ];
        console.log(help.join("\n"));
        process.exit(0);
    }

    // version
    if (cli_arg.v || cli_arg.version) {
        console.log(cli_color.red(PackageJSon.name), "Version:", cli_color.blueBright(PackageJSon.version), "by", cli_color.blueBright(PackageJSon.author));
        console.log("Issues url:", PackageJSon.bugs.url, "Source URL:", PackageJSon.homepage);
        process.exit(0);
    }

    // select MacOS version
    if (cli_arg.o || cli_arg.os) {
        const os = (cli_arg.o || cli_arg.os).toLowerCase();
        if (/big sur/.test(os)) {
            KVM_Config.set_os("big sur");
        } else if (/catalina/.test(os)) {
            KVM_Config.set_os("catalina");
        } else if (/mojave/.test(os)) {
            KVM_Config.set_os("mojave");
        } else if (/high sierra/.test(os)) {
            KVM_Config.set_os("high sierra");
        } else {
            console.log(cli_color.red("Error: Mac OS version not found!"));
            process.exit(1);
        }
    }

    // select path to storage you files
    if (cli_arg.p || cli_arg.path) {
        const path_to_storage = path.resolve(cli_arg.p || cli_arg.path);
        console.log(cli_color.green("Path to storage: "), cli_color.yellow(path_to_storage));
        KVM_Config.set_path_to_storage(path_to_storage);
    }

    // setup host to run qemu and kvm
    if (cli_arg.s || cli_arg.setup) {
        console.log(cli_color.red("We are in development, so far we only work with Debian-based distribution!"));
        if (readline.keyInYNStrict("Do you want to continue?")) {
            const ubuntu = require("./src/pre_install/ubuntu");
            await ubuntu();
        }
    }
    // run qemu
    const Log = (data = "") => {
        if (KVM_Config().display.password) data = data.replace(RegExp(KVM_Config().display.password, "gi"), "***");
        if (/audio|ALSA/gi.test(data)) data = data.split(/\n/g).filter(x => !(/audio|ALSA/gi.test(x))).join("\n");
        // Log
        process.stdout.write(data);
    }
    console.log(cli_color.green("Starting QEMU..."));
    const run = QEMURUN();
    run.VM.stdout.on("data", Log);
    run.VM.stderr.on("data", Log);
    console.log(cli_color.green("QEMU is running!"));
    console.log(cli_color.green(`It started with ${run.disks} disks`));
})()