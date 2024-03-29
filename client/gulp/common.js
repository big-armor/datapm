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

exports.linkDataPMClientLib = function () {
    const libPath = path.join(__dirname, "..", "dist", "node_modules");
    if (!fs.existsSync(libPath)) {
        fs.mkdirSync(libPath, { recursive: true });
    }

    const targetPath = path.join(libPath, "datapm-client-lib");
    if (!fs.existsSync(targetPath)) {
        fs.symlinkSync(path.join(__dirname, "..", "..", "client-lib", "dist"), targetPath, "dir");
    }

    return Promise.resolve();
};

exports.linkDataPMLib = function () {
    const libPath = path.join(__dirname, "..", "dist", "node_modules");
    if (!fs.existsSync(libPath)) {
        fs.mkdirSync(libPath, { recursive: true });
    }

    const targetPath = path.join(libPath, "datapm-lib");
    if (!fs.existsSync(targetPath)) {
        fs.symlinkSync(path.join(__dirname, "..", "..", "lib", "dist"), targetPath, "dir");
    }

    return Promise.resolve();
};

exports.copyDeps = function (directory) {
    const destination = path.join(__dirname, "..", directory, "node_modules");
    console.log(destination);
    return src(
        [
            "../client-lib/node_modules/open",
            "../client-lib/node_modules/mmmagic/**/*",
            "../client-lib/node_modules/node-expat/**/*"
        ],
        {
            base: "../client-lib/node_modules"
        }
    ).pipe(dest(destination));
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
