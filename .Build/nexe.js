#!/usr/bin/env node
const { compile } = require("nexe");
const { resolve } = require("path");

// Build Binarie
compile({
    name: "MacOSQemu",
    build: true,
    input: resolve(__dirname, "../index.js"),
    output: `MacOSQEMU_${process.platform}_${process.arch}`,
    resources: [
        resolve(__dirname, "../OSX-KVM"),
    ],
}).then(() => {console.log("success")})