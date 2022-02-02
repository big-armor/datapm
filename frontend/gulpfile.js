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


function clean() {
    return new Promise((resolve) => {
        if (fs.existsSync("dist")) fs.rmSync("dist", { recursive: true, force: true });

        resolve();
    });
}

exports.clean = clean;