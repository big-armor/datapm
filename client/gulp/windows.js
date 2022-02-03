/* eslint-disable @typescript-eslint/no-var-requires */
const {
    readPackageVersion,
    cleanDir,
    copyDeps,
    copyAssets,
    spawnAndLog,
    copyAppManfifest,
    runPkg
} = require("./common");
const del = require("del");
const fs = require("fs");
const path = require("path");

/** Windows 64 Bit */

exports.runPkgWin64 = function () {
    return runPkg("win", "x64", "pkg-windows-intel64");
};

exports.cleanWin64 = function () {
    if (fs.existsSync("datapm-client-" + readPackageVersion() + "-x64.msix"))
        del("datapm-client-" + readPackageVersion() + "-x64.msix");

    return cleanDir("pkg-windows-intel64");
};

exports.copyDepsWin64 = function () {
    return copyDeps("pkg-windows-intel64");
};

exports.copyAssetsWin64 = function () {
    return copyAssets("pkg-windows-intel64");
};

exports.copyAppManifiestWin64 = function () {
    return copyAppManfifest("pkg-windows-intel64");
};

exports.createMsiWin64 = function () {
    return spawnAndLog(
        "msi-intel64",
        "C:\\Program Files (x86)\\Windows Kits\\10\\App Certification Kit\\makeappx.exe",
        [
            "pack",
            "/d",
            "pkg-windows-intel64",
            "/p",
            "installers/windows/dist/datapm-client-" + readPackageVersion() + "-x64.msix"
        ]
    );
};

exports.signMsiWin64 = function () {
    return spawnAndLog(
        "sign-intel64",
        "C:\\Program Files (x86)\\Windows Kits\\10\\App Certification Kit\\signtool.exe",
        [
            "sign",
            "/fd",
            "SHA256",
            "/a",
            "/f",
            "signing-certificate.p12",
            "/p",
            process.env.CERTIFICATE_PASSWORD,
            "installers/windows/dist/datapm-client-" + readPackageVersion() + "-x64.msix"
        ]
    );
};

/** Windows arm64 */

exports.runPkgWindowsArm64 = function () {
    return runPkg("win", "arm64", "pkg-windows-arm64");
};

exports.cleanWindowsArm64 = function () {
    if (fs.existsSync("datapm-client-" + readPackageVersion() + "-arm64.msix"))
        del("datapm-client-" + readPackageVersion() + "-arm64.msix");
    return cleanDir("pkg-windows-arm64");
};

exports.cleanMacOSInstaller = function () {
    cleanDir(path.join("installers", "macos", "macOS-x64", "target"));
    return cleanDir(path.join("installers", "macos", "macOS-x64", "application"));
};

exports.writeCertificateFile = function () {
    fs.writeFileSync("signing-certificate.p12", process.env.CERTIFICATE_BASE64, { encoding: "base64" });

    return Promise.resolve();
};

exports.copyDepsWindowsArm64 = function () {
    return copyDeps("pkg-windows-arm64");
};

exports.copyAssetsWindowsArm64 = function () {
    return copyAssets("pkg-windows-arm64");
};

exports.copyAppManifiestWindowsArm64 = function () {
    return copyAppManfifest("pkg-windows-arm64");
};

exports.createMsiWindowsArm64 = function () {
    return spawnAndLog("msi-arm64", "makeappx.exe", [
        "pack",
        "/d",
        "pkg-windows-arm64",
        "/p",
        "installers/windows/dist/datapm-client-" + readPackageVersion() + "-arm64.msix"
    ]);
};

exports.signMsiWindowsArm64 = function () {
    return spawnAndLog("sign-arm64", "C:\\Program Files (x86)\\Windows Kits\\10\\App Certification Kit\\signtool.exe", [
        "sign",
        "/fd",
        "SHA256",
        "/a",
        "/f",
        "signing-certificate.p12",
        "/p",
        process.env.CERTIFICATE_PASSWORD,
        "installers/windows/dist/datapm-client-" + readPackageVersion() + "-arm64.msix"
    ]);
};

exports.bundleWinInstallers = function () {
    return spawnAndLog(
        "bundle-win-installers",
        "C:\\Program Files (x86)\\Windows Kits\\10\\App Certification Kit\\makeappx.exe",
        [
            "bundle",
            "/d",
            "installers/windows/dist",
            "/p",
            "installers/windows/dist/datapm-client-" + readPackageVersion() + ".msixbundle"
        ]
    );
};

exports.signWinBundle = function () {
    return spawnAndLog(
        "sign-win-bundle",
        "C:\\Program Files (x86)\\Windows Kits\\10\\App Certification Kit\\signtool.exe",
        [
            "sign",
            "/fd",
            "SHA256",
            "/a",
            "/f",
            "signing-certificate.p12",
            "/p",
            process.env.CERTIFICATE_PASSWORD,
            "installers/windows/dist/datapm-client-" + readPackageVersion() + ".msixbundle"
        ]
    );
};
