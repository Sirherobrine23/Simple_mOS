const child_process = require("child_process");
const os = require("os");
const path = require("path");
const fs = require("fs");

const MacOS_Products = require("./products.json")

let Python;
if (process.platform === "win32") Python = "python";
else {
    try {
        child_process.execSync("command -v python3");
        Python = "python3";
    } catch (err) {
        Python = "python";
    }
}

function CleanFetchTempPath() {
    const FetchTemp = path.resolve(os.tmpdir(), "Fetch_OS_BaseSystem");
    if (fs.existsSync(FetchTemp)) {
        fs.readdirSync(FetchTemp).forEach(file => {
            fs.rmSync(path.join(FetchTemp, file), {recursive: true});
        });
    }
    return true;
}

function FetchOS(System = "Catalina"){
    CleanFetchTempPath();
    // Get the system info for fetch BaseSytem
    var SystemJSON;
    console.log(`Fetching ${System}`);
    if (typeof System === "number") {
        if (MacOS_Products[System]) SystemJSON = MacOS_Products[System];
    } else if (typeof System === "string") {
        System = RegExp(System.toLowerCase().trim());
        for (let SystemArray of MacOS_Products) {
            if (System.test(SystemArray.name)) SystemJSON = SystemArray;
        }
    }
    // check
    if (!SystemJSON) throw new Error("MacOS Version not found")
    
    // Create Argvs
    const ArgV = []
    // Add add argv output files
    const RandomPath = path.resolve(os.tmpdir(), "Fetch_OS_BaseSystem");
    fs.mkdirSync(RandomPath, {recursive: true});
    ArgV.push("--action", "download", "--outdir", RandomPath);

    // OS Type
    if (SystemJSON.os_type) ArgV.push("--os-type", SystemJSON.os_type);
    
    // mlb
    if (SystemJSON["m"]) ArgV.push("--mlb", SystemJSON["m"]);

    // Mac board id
    if (SystemJSON["b"]) ArgV.push("--board-id", SystemJSON["b"])

    console.log(`Downloading BaseSystem for ${SystemJSON.name}`);
    try {
        child_process.execFileSync(Python, [path.resolve(__dirname, "../OsxKvm_kholia/fetch-macOS-v2.py"), ...ArgV], {cwd: RandomPath}).toString();
        return {
            System: path.join(RandomPath, "BaseSystem.dmg"),
            Chunklist: path.join(RandomPath, "BaseSystem.chunklist"),
        }
    } catch (err){
        fs.writeFileSync(path.join(RandomPath, "error.log"), err.toString());
        throw new Error("Unable to download BaseSystem")
    }
}

module.exports = FetchOS;
module.exports.SystemAvaible = MacOS_Products.map(System => System.name);