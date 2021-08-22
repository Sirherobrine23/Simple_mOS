const { execSync } = require("child_process");
// const { readFileSync, writeFileSync } = require("fs");
const { tmpdir } = require("os");
const { resolve, join } = require("path");
const { exit } = require("process");
// Product
// const MacOS_Products = JSON.parse(readFileSync(resolve(__dirname, "./FetchOS/products.json"), "utf8"))
const MacOS_Products = require("./products.json")

const Python = (function(){if (process.platform === "win32") return "python";return "python3"})()

function FetchOS(System = "Catalina"){
    const ArgV = []
    var SystemJSON = {}
    SystemJSON = (function(){
        if (typeof System === "number") {
            if (MacOS_Products[System]) return MacOS_Products[System]
        } else {
            for (let SystemArray of MacOS_Products) {
                if (SystemArray.name === System) return SystemArray
            }
        }
        console.log("FetchOS: invalid option");
        exit(22)
    })()

    // console.log(SystemJSON);

    ArgV.push(
        "--action download",
        `--outdir ${tmpdir()}`
    )

    if (SystemJSON.os_type) ArgV.push(`--os-type ${SystemJSON.os_type}`)
    if (SystemJSON["m"]) ArgV.push(`--mlb "${SystemJSON["m"]}"`)
    if (SystemJSON["b"]) ArgV.push(`--board-id "${SystemJSON["b"]}"`)

    console.log(`Downloading BaseSystem for ${SystemJSON.name}`);
    execSync(`${Python} ${resolve(__dirname, "./FetchOS/FetchOS.py")} ${ArgV.join(" ")}`, {cwd: resolve(__dirname, "./FetchOS")}).toString()
    return {
        System: join(tmpdir(), "BaseSystem.dmg"),
        Chunklist: join(tmpdir(), "BaseSystem.chunklist"),
    }
}

module.exports = {
    FetchOS
}
