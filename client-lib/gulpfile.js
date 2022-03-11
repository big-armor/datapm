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

    packageJson.main = "main.js";
    packageJson.dependencies["datapm-lib"] = "../../lib/dist"

    // write the new package.json file
    fs.writeFileSync(path.join("dist", "package.json"), JSON.stringify(packageJson, null, 2));

    return Promise.resolve();
}

function linkDataPMLib() {
     const libPath = path.join(__dirname, "dist", "node_modules");
    if (!fs.existsSync(libPath)) {
        fs.mkdirSync(libPath, { recursive: true });
    }

    const targetPath = path.join(libPath, "datapm-lib");
    if (!fs.existsSync(targetPath)) {
        fs.symlinkSync(path.join(__dirname, "..", "lib", "dist"), targetPath, "dir");
    }

    return Promise.resolve();
}

exports.prebuild = series(clean);
exports.postbuild = series(copyPackageFiles, modifyPackagefile, linkDataPMLib);
