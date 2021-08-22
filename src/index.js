const child_process = require("child_process");
const fs = require("fs");
const express = require("express");
const app = express();


// Get Status
app.get("/Status", (req, res) => {});

// Get VNC Auth
app.get("/vnc/oAuth", (req, res) => {});

// Get Settings
app.get("/settings/get", (req, res) => {});

// Save Ssttings
app.post("/settings/save", (req, res) => {});

// Maneger QEMU
