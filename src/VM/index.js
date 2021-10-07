const fs = require("fs");
const path = require("path");
const js_yaml = require("js-yaml");
const deepmerge = require("deepmerge");
const PathControl = require("../lib/Storage_Files_Path");

const ConfigFile = path.join(PathControl, "VM.yaml");
const save = () => fs.writeFileSync(ConfigFile, js_yaml.dump(VMConfig));
let VMConfig = {
  ram_memory: 3072,
  CPU: {
    Model: "Penryn",
    Cores: 2,
    Threads: 2,
    Sockets: 1,
    QemuOptions: [
      "+ssse3",
      "+sse4.2",
      "+popcnt",
      "+avx",
      "+aes",
      "+xsave",
      "+xsaveopt",
      "check"
    ]
  },
  Network: {
    // MAC: "52:54:00:c9:18:27",
    MAC: "XX:XX:XX:XX:XX:XX".replace(/X/g, () => { return "0123456789ABCDEF".charAt(Math.floor(Math.random() * 16)) }),
  }
}

if (fs.existsSync(ConfigFile)) {
  VMConfig = deepmerge(VMConfig, js_yaml.load(fs.readFileSync(ConfigFile, "utf8")));
} else save();

module.exports = {
  GetConfig: () => VMConfig
}