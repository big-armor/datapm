const fs = require("fs");
const spawn = require("child_process").spawn;
const path = require("path");

function spawnAndLog(prefix, command, args, opts) {

    let systemCommand = command;
    if(command === "npm") {
        if(process.platform === "win32")
            systemCommand = "npm.cmd";
    }

    const child = spawn(systemCommand, args, opts);

    child.stdout.on("data", function (chunk) {
        console.log("[" + prefix + "] " + chunk.toString());
    });

    child.stderr.on("data", function (chunk) {
        console.error("[" + prefix + "-err] " + chunk.toString());
    });

    return child;
}

function linkDataPMLib() {
    const libPackageJsonFilePath = path.join(__dirname, "..", "lib", "package.json");

    if (!fs.existsSync(libPackageJsonFilePath)) return;

    const fileContents = fs.readFileSync(libPackageJsonFilePath);
    const libPackageFile = JSON.parse(fileContents);

    if (libPackageFile.name !== "datapm-lib") return;

    return spawnAndLog("link-datapm-lib", "npm", ["link", "datapm-lib"]);
}

function clean() {
    return new Promise((resolve) => {
        if (fs.existsSync("dist")) fs.rmSync("dist", { recursive: true, force: true });

        resolve();
    });
}

exports.postinstall = linkDataPMLib;
exports.clean = clean;