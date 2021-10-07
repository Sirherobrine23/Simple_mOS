const fs = require("fs");
const path = require("path");
const js_yaml = require("js-yaml");
const deepmerge = require("deepmerge");
const PathControl = require("../lib/Storage_Files_Path");

const ConfigFile = path.join(PathControl, "Disk.yaml");
const save = () => fs.writeFileSync(ConfigFile, js_yaml.dump(DiskConfig));
let DiskConfig = {
  disk_path: path.join(PathControl, "Disks"),
  install_system: {
    enable: true,
    os: "mojave",
    path: path.join(PathControl, "Disks/Base_System.qcow2"),
  },
  opencore_bootloader: {
    path: path.join(PathControl, "Disks/OpenCore_User.qcow2"),
    name: "OpenCore_Bootloader"
  },
  disks: [
    {
      name: "Os_System",
      type: "file",
      size: "80G",
      path: path.join(PathControl, "Disks", "Os_System"),
    },
    {
      name: "Data",
      type: "disk",
      Azure_disk: false,
      path: "/dev/sdb"
    }
  ]
}

if (fs.existsSync(ConfigFile)) {
  DiskConfig.disks = [];
  DiskConfig = deepmerge(DiskConfig, js_yaml.load(fs.readFileSync(ConfigFile, "utf8")));
} else {
  DiskConfig.disks = [
    {
      name: "Os_System",
      type: "file",
      size: "80G",
      path: path.join(PathControl, "Disks", "Os_System"),
    }
  ];
  save();
}

if (!(fs.existsSync(DiskConfig.disk_path))) fs.mkdirSync(DiskConfig.disk_path, { recursive: true });

function AddDisk(Size = "10G", Name = Math.random().toString(36).substring(2), Type = "file", Path = path.join(PathControl, Name), Azure_disk = false) {
  const Disk = {
    name: Name ? Name : Math.random().toString(36).substring(2),
    type: Type ? Type.toLocaleLowerCase() : "file",
    size: Size ? Size : "10G",
    path: Path ? Path : path.join(PathControl, Name ? Name : Math.random().toString(36).substring(2)),
    Azure_disk: Azure_disk
  };
  if (Disk.azure_disk === true) {
    if (Disk.type === "file") Disk.type = "disk";
    if (Disk.size) delete Disk.size;
  } else if (Disk.type === "file") {
    if (typeof Disk.Azure_disk === "boolean") delete Disk.Azure_disk;
  }
  if (DiskConfig.disks.find(disk => disk.name === Disk.name)) throw new Error("Disk with this name already exists");
  DiskConfig.disks.push(Disk);
  save();
  return Disk;
}

function RemoveDisk(Name) {
  if (!DiskConfig.disks.find(disk => disk.name === Name)) throw new Error("Disk with this name not found");
  DiskConfig.disks = DiskConfig.disks.filter(disk => disk.name !== Name);
  save();
  return;
}

module.exports = {
  GetConfig: () => DiskConfig,
  AddDisk: AddDisk,
  RemoveDisk: RemoveDisk
}