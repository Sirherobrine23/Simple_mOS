const fs = require("fs");
const path = require("path");
const js_yaml = require("js-yaml");
const deepmerge = require("deepmerge");
const PathControl = require("../lib/Storage_Files_Path");

// "virtio-gpu-pci,virgl=on", // 14MB
// "virtio-vga,virgl=on", // 7MB
// "vmware-svga", // 7MB
// "qxl-vga", // 7MB
//  VGA,vgamem_mb=128 // 128MB

const ConfigFile = path.join(PathControl, "Display.yaml");
let DisplayConfig = {
  Display_Adapter: "VGA",
  options: ["vgamem_mb=128"],
  vnc: {
    password: Math.random().toString(36).substring(2, 15).slice(0, 8),
    port: 1
  }
}

const save = () => fs.writeFileSync(ConfigFile, js_yaml.dump(DisplayConfig));
if (fs.existsSync(ConfigFile)) {
  DisplayConfig.options = [];
  DisplayConfig = deepmerge(DisplayConfig, js_yaml.load(fs.readFileSync(ConfigFile, "utf8")));
} else save();

function Get_QEMU_Command() {
  let Arg = DisplayConfig.Display_Adapter;
  if (DisplayConfig.options.length > 0) Arg += "," + DisplayConfig.options.join(",");
  return {
    Command: [
      "-device", process.env.ISDOCKER === "true" ? "VGA,vgamem_mb=128" : Arg
    ],
    VncCommand: `change vnc password ${DisplayConfig.vnc.password}`,
  };
}

module.exports = {
  Get_QEMU_Command,
  Update_Display_Adapter: (Adapter, ...Options) => {
    DisplayConfig.Display_Adapter = Adapter;
    DisplayConfig.options = Options;
  },
  Update_VNC: (Port, Password) => {
    DisplayConfig.vnc.port = parseInt(Port);
    DisplayConfig.vnc.password = String(Password).slice(0, 8);
  }
}