/* eslint-disable @typescript-eslint/no-var-requires */
const { series, src, dest } = require("gulp");
const fs = require("fs");
const path = require("path");

async function clean() {
    if (fs.existsSync("dist")) fs.rmSync("dist", { recursive: true, force: true });
}

function copyPackageFiles() {
    return src(["package.json", "package-lock.json"]).pipe(dest("dist"));
}

function modifyPackagefile() {
    const packageJson = JSON.parse(fs.readFileSync(path.join("dist", "package.json"), "utf8"));

    packageJson.main = "src/main.js";

    // write the new package.json file
    fs.writeFileSync(path.join("dist", "package.json"), JSON.stringify(packageJson, null, 2));

    return Promise.resolve();
}

exports.prebuild = series(clean);
exports.postbuild = series(copyPackageFiles, modifyPackagefile);
