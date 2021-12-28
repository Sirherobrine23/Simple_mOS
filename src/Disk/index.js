const { execFileSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const DiskConfig = require("./Config");
const getOSIntaller = require("../lib/fetchOS/index");

function Get_QEMU_Command() {
  const Config = DiskConfig.GetConfig();
  let sata_id = 1;
  const Command_Array = [
    // Sata Controller
    "-device", "ich9-intel-hda",
    "-device", "hda-duplex",
    "-device", "ich9-ahci,id=sata",
  ];

  // OpenCore Bootloader Disk
  Command_Array.push(
    "-drive", `id=OpenCoreBoot,if=none,snapshot=on,format=qcow2,file=${Config.opencore_bootloader.path}`,
    "-device", `ide-hd,bus=sata.${sata_id},drive=OpenCoreBoot`,
  );
  sata_id++;
  
  // Os Base Installer
  if (process.env.INSTALL_SYSTEM === "true" || Config.install_system.enable) {
    const InstallerPath = getOSIntaller(process.env.SYSTEM_NAME || Config.install_system.os);
    if (fs.existsSync(Config.install_system.path)) fs.rmSync(Config.install_system.path);
    execFileSync("qemu-img", ["convert", "-O", "qcow2", InstallerPath.System, Config.install_system.path]);
    Command_Array.push(
      "-drive", `id=Installer,if=none,snapshot=on,format=qcow2,file=${Config.install_system.path}`,
      "-device", `ide-hd,bus=sata.${sata_id},drive=Installer`,
    );
    sata_id++;
  }

  // User disks
  if (Config.disks.length < 0) throw new Error("No disks defined");
  for (const Disk of Config.disks) {
    const RandomID = (Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)).replace(/[0-9]/gi, "");
    if (Disk.type === "disk") {
      // Azure LUN
      if (typeof Disk.Azure_disk === "function" && Disk.Azure_disk) {
        const DiskPath = path.join("/dev/disk/azure/scsi1", `lun${Disk.path}`);
        try {execFileSync("umount", [DiskPath]);} catch (e) {}
        Command_Array.push(
          "-drive", `id=${RandomID},if=none,file=${DiskPath},format=raw`,
          "-device", `ide-hd,bus=sata.${sata_id},drive=${RandomID}`
        ); 
      } else {
        try {execFileSync("umount", [Disk.path])} catch(e){}
        Command_Array.push(
          "-drive", `id=${RandomID},if=none,file=${Disk.path},format=raw`,
          "-device", `ide-hd,bus=sata.${sata_id},drive=${RandomID}`
        );
      }
    } else {
      if (!(fs.existsSync(Disk.path+".qcow2"))) {
        console.log("Created Disk:", Disk.path, "Size:", Disk.size)
        execFileSync("qemu-img", ["create" , "-f", "qcow2", Disk.path+".qcow2", Disk.size]);
      }
      Command_Array.push(
        "-drive", `id=${RandomID},if=none,file=${Disk.path+".qcow2"},format=qcow2`,
        "-device", `ide-hd,bus=sata.${sata_id},drive=${RandomID}`
      );
    }
    sata_id++;
  }
  return Command_Array;
}

module.exports = {
  Get_QEMU_Command,
  AddDisk: DiskConfig.AddDisk,
  RemoveDisk: DiskConfig.RemoveDisk,
  GetConfig: DiskConfig.GetConfig
}