/* eslint-disable @typescript-eslint/no-var-requires */
const { src, dest } = require("gulp");
const spawn = require("child_process").spawn;
const del = require("del");
const fs = require("fs");
const convert = require("xml-js");

const path = require("path");

const NODE_VERSION = "node16";

exports.readPackageVersion = function () {
    const fileContents = fs.readFileSync("package.json");
    const packageFile = JSON.parse(fileContents);
    return packageFile.version;
};

exports.cleanDir = function (directory) {
    return del(directory, { force: true });
};

exports.runPkg = function (platform, architecture, destination) {
    const cmd = process.platform === "win32" ? "npx.cmd" : "npx";

    return exports
        .spawnAndLog("run-pkg-" + platform + "-" + architecture, cmd, [
            "pkg",
            "package.json",
            "--out-path",
            destination,
            "--target",
            NODE_VERSION + "-" + platform + "-" + architecture
        ])
        .addListener("close", () => {
            exports.renameBinary(
                path.join(destination, "datapm-client" + (platform === "win" ? ".exe" : "")),
                path.join(destination, "datapm" + (platform === "win" ? ".exe" : ""))
            );
        });
};

exports.renameBinary = function (binaryFile, destinationFile) {
    fs.renameSync(binaryFile, destinationFile);
};

exports.copyDeps = function (directory) {
    return src(["node_modules/mmmagic/**/*", "node_modules/node-expat/**/*"], {
        base: "./node_modules/"
    }).pipe(dest(path.join(directory, "node_modules")));
};

exports.copyAssets = function (directory) {
    return src(["assets/**/*"]).pipe(dest(path.join(directory, "assets")));
};

exports.copyAppManfifest = function (directory) {
    // Read config.xml file synchronously
    const xmlBuffer = fs.readFileSync("./installers/windows/appxmanifest.xml");
    let xmlString = xmlBuffer.toString();

    // Use cheerio to parse the xml and extract the version number
    const manifestJson = convert.xml2json(xmlString, { compact: true, spaces: 4 });
    const manifestObject = JSON.parse(manifestJson);
    const versionNumber = manifestObject.Package.Identity._attributes.Version;

    xmlString = xmlString.replace(versionNumber, exports.readPackageVersion() + "." + process.env.GITHUB_RUN_NUMBER);

    if (!fs.existsSync(directory)) fs.mkdirSync(directory);

    fs.writeFileSync(directory + "/appxmanifest.xml", xmlString);

    return Promise.resolve();
};

exports.spawnAndLog = function (prefix, command, args, opts) {
    let systemCommand = command;
    if (command === "npm") {
        if (process.platform === "win32") systemCommand = "npm.cmd";
    }

    const child = spawn(systemCommand, args, opts);
    child.stdout.on("data", function (chunk) {
        console.log("[" + prefix + "] " + chunk.toString());
    });

    child.stderr.on("data", function (chunk) {
        console.error("[" + prefix + "-err] " + chunk.toString());
    });

    return child;
};

exports.cleanDist = function () {
    return exports.cleanDir("dist");
};
