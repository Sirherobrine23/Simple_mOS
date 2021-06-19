#!/usr/bin/env node
const { compile } = require("nexe");
const { resolve } = require("path");
const PackageJson = require("../package.json")

// Build Binarie
compile({
    name: PackageJson.build.name,
    build: true,
    input: resolve(__dirname, "../index.js"),
    output: resolve(__dirname, `${PackageJson.name}_${process.platform}_${process.arch}_binarie`),
    resources: [
        resolve(__dirname, "../lib"),
        resolve(__dirname, "../MacOS"),
        resolve(__dirname, "../SystemCheck"),
        resolve(__dirname, "../package.json")
    ],
}).then(() => {console.log("success")})