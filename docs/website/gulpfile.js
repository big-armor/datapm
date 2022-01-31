const fs = require("fs");

function clean() {
    return new Promise((resolve) => {
        if (fs.existsSync("build")) fs.rmSync("build", { recursive: true, force: true });

        resolve();
    });
}


exports.clean = clean;
