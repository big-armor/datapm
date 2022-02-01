/* eslint-disable @typescript-eslint/no-var-requires */
const { series, src, dest } = require("gulp");
const spawn = require("child_process").spawn;
const del = require("del");
const fs = require("fs");
const convert = require("xml-js");

const path = require("path");

const NODE_VERSION = "node14";

function readPackageVersion() {
    const fileContents = fs.readFileSync("package.json");
    const packageFile = JSON.parse(fileContents);
    return packageFile.version;
}

function cleanDir(directory) {
    return del(directory, { force: true });
}

function runPkg(platform, architecture, destination) {
    const cmd = process.platform === "win32" ? "npx.cmd" : "npx";

    return spawnAndLog("run-pkg-" + platform + "-" + architecture, cmd, [
        "pkg",
        "package.json",
        "--out-path",
        destination,
        "--target",
        NODE_VERSION + "-" + platform + "-" + architecture
    ]).addListener("close", () => {
        renameBinary(
            path.join(destination, "datapm-client" + (process.platform === "win32" ? ".exe" : "")),
            path.join(destination, "datapm" + (process.platform === "win32" ? ".exe" : ""))
        );
    });
}

function renameBinary(binaryFile, destinationFile) {
    fs.renameSync(binaryFile, destinationFile);
}

function copyDeps(directory) {
    return src(["node_modules/mmmagic/**/*", "node_modules/node-expat/**/*"], { base: "./node_modules/" }).pipe(
        dest(path.join(directory, "node_modules"))
    );
}

function copyAssets(directory) {
    return src(["assets/**/*"]).pipe(dest(path.join(directory, "assets")));
}

function copyAppManfifest(directory) {
    // Read config.xml file synchronously
    const xmlBuffer = fs.readFileSync("./installers/windows/appxmanifest.xml");
    let xmlString = xmlBuffer.toString();

    // Use cheerio to parse the xml and extract the version number
    const manifestJson = convert.xml2json(xmlString, { compact: true, spaces: 4 });
    const manifestObject = JSON.parse(manifestJson);
    const versionNumber = manifestObject.Package.Identity._attributes.Version;

    xmlString = xmlString.replace(versionNumber, readPackageVersion() + "." + process.env.GITHUB_RUN_NUMBER);

    if (!fs.existsSync(directory)) fs.mkdirSync(directory);

    fs.writeFileSync(directory + "/appxmanifest.xml", xmlString);

    return Promise.resolve();
}

function spawnAndLog(prefix, command, args, opts) {
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
}

/** Windows 64 Bit */

function runPkgWin64() {
    return runPkg("win", "x64", "pkg-win64");
}

function cleanWin64() {
    if (fs.existsSync("datapm-client-" + readPackageVersion() + "-x64.msix"))
        del("datapm-client-" + readPackageVersion() + "-x64.msix");
    return cleanDir("pkg-win64");
}

function copyDepsWin64() {
    return copyDeps("pkg-win64");
}

function copyAssetsWin64() {
    return copyAssets("pkg-win64");
}

function copyAppManifiestWin64() {
    return copyAppManfifest("pkg-win64");
}

function createMsiWin64() {
    return spawnAndLog("msi-win64", "C:\\Program Files (x86)\\Windows Kits\\10\\App Certification Kit\\makeappx.exe", [
        "pack",
        "/d",
        "pkg-win64",
        "/p",
        "installers/windows/dist/datapm-client-" + readPackageVersion() + "-x64.msix"
    ]);
}

function signMsiWin64() {
    return spawnAndLog("sign-win64", "C:\\Program Files (x86)\\Windows Kits\\10\\App Certification Kit\\signtool.exe", [
        "sign",
        "/fd",
        "SHA256",
        "/a",
        "/f",
        "signing-certificate.pfx",
        "/p",
        process.env.CERTIFICATE_PASSWORD,
        "datapm-client-" + readPackageVersion() + "-x64.msix"
    ]);
}

/** Windows x86 */

function runPkgWin86() {
    return runPkg("win", "x86", "pkg-win86");
}

function cleanWin86() {
    if (fs.existsSync("datapm-client-" + readPackageVersion() + "-x86.msix"))
        del("datapm-client-" + readPackageVersion() + "-x86.msix");
    return cleanDir("pkg-win86");
}

function cleanMacOSInstaller() {
    cleanDir(path.join("installers", "macos", "macOS-x64", "target"));
    return cleanDir(path.join("installers", "macos", "macOS-x64", "application"));
}

function writeCertificateFile() {
    fs.writeFileSync("signing-certificate.pfx", process.env.CERTIFICATE_BASE64, { encoding: "base64" }, function () {
        console.log("Signing Certificate");
    });

    return Promise.resolve();
}

function copyDepsWin86() {
    return copyDeps("pkg-win86");
}

function copyAssetsWin86() {
    return copyAssets("pkg-win86");
}

function copyAppManifiestWin86() {
    return copyAppManfifest("pkg-win86");
}

function createMsiWin86() {
    return spawnAndLog("msi-win86", "makeappx.exe", [
        "pack",
        "/d",
        "pkg-win86",
        "/p",
        "installers/windows/dist/datapm-client-" + readPackageVersion() + "-x86.msix"
    ]);
}

function signMsiWin86() {
    return spawnAndLog("sign-win86", "SignTool", [
        "sign",
        "/fd",
        "SHA256",
        "/a",
        "/f",
        "signing-certificate.pfx",
        "/p",
        process.env.CERTIFICATE_PASSWORD,
        "datapm-client-" + readPackageVersion() + "-x86.msix"
    ]);
}
/** Mac 64 Bit Intel */
function runPkgMac64() {
    return runPkg("macos", "x64", "pkg-mac64");
}

function cleanMac64() {
    return cleanDir("pkg-mac64");
}

function cleanDist() {
    return cleanDir("dist");
}

function copyDepsMac64() {
    return copyDeps("pkg-mac64");
}

function copyAssetsMac64() {
    return copyAssets("pkg-mac64");
}

function linkDataPMLib() {
    const libPackageJsonFilePath = path.join(__dirname, "..", "lib", "package.json");

    if (!fs.existsSync(libPackageJsonFilePath)) return;

    const fileContents = fs.readFileSync(libPackageJsonFilePath);
    const libPackageFile = JSON.parse(fileContents);

    if (libPackageFile.name !== "datapm-lib") return;

    return spawnAndLog("link-datapm-lib", "npm", ["link", "datapm-lib"]);
}

function postCodegen() {
    fs.copyFileSync(
        path.join("src", "generated", "graphql.ts"),
        path.join("test", "integration", "registry-client.ts")
    );

    return Promise.resolve();
}

function bundleWinInstallers() {
    return spawnAndLog("bundle-win-installers", "makeappx.exe", [
        "bundle",
        "/d",
        "win-installers",
        "/p",
        "datapm-client-" + readPackageVersion() + ".msixbundle"
    ]);
}

function signWinBundle() {
    return spawnAndLog("sign-win-bundle", "SignTool", [
        "sign",
        "/fd",
        "SHA256",
        "/a",
        "/f",
        "signing-certificate.pfx",
        "/p",
        process.env.CERTIFICATE_PASSWORD,
        "datapm-client-" + readPackageVersion() + ".msixbundle"
    ]);
}

exports.buildWindows64 = series(
    cleanWin64,
    writeCertificateFile,
    runPkgWin64,
    copyDepsWin64,
    copyAssetsWin64,
    copyAppManifiestWin64,
    createMsiWin64,
    signMsiWin64
);
exports.buildWindows86 = series(
    cleanWin86,
    writeCertificateFile,
    runPkgWin86,
    copyDepsWin86,
    copyAssetsWin86,
    copyAppManifiestWin86,
    createMsiWin86,
    signMsiWin86
);

exports.buildWindowsBundle = series(bundleWinInstallers, signWinBundle);

exports.buildMacOSx64 = series(cleanMac64, runPkgMac64, copyDepsMac64, copyAssetsMac64);
exports.clean = series(cleanDist, cleanMac64, cleanWin64, cleanWin86, cleanMacOSInstaller);

exports.postinstall = linkDataPMLib;
exports.postCodegen = postCodegen;
