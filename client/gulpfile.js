/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require("fs");
const path = require("path");
const {
    cleanWin64,
    runPkgWin64,
    copyDepsWin64,
    copyAssetsWin64,
    copyAppManifiestWin64,
    cleanWindowsArm64,
    runPkgWindowsArm64,
    copyDepsWindowsArm64,
    copyAssetsWindowsArm64,
    copyAppManifiestWindowsArm64,
    writeCertificateFile,
    createMsiWin64,
    signMsiWin64,
    createMsiWindowsArm64,
    signMsiWindowsArm64,
    bundleWinInstallers,
    signWinBundle
} = require("./gulp/windows");

const {
    cleanMacArm64,
    runPkgMacArm64,
    copyDepsMacArm64,
    copyAssetsMacArm64,
    cleanMacIntel64,
    runPkgMacIntel64,
    copyDepsMacIntel64,
    copyAssetsMacIntel64,
    cleanMacOSInstaller
} = require("./gulp/macos");

const {
    cleanLinuxArm64,
    runPkgLinuxArm64,
    copyDepsLinuxArm64,
    copyAssetsLinuxArm64,
    cleanLinuxIntel64,
    runPkgLinuxIntel64,
    copyDepsLinuxIntel64,
    copyAssetsLinuxIntel64
} = require("./gulp/linux");

const { cleanDist } = require("./gulp/common");
const { series } = require("gulp");

exports.buildWindowsIntel64 = series(
    cleanWin64,
    runPkgWin64,
    copyDepsWin64,
    copyAssetsWin64,
    copyAppManifiestWin64,
    writeCertificateFile,
    createMsiWin64,
    signMsiWin64
);

exports.buildWindowsArm64 = series(
    cleanWindowsArm64,
    runPkgWindowsArm64,
    copyDepsWindowsArm64,
    copyAssetsWindowsArm64,
    copyAppManifiestWindowsArm64,
    writeCertificateFile,
    createMsiWindowsArm64,
    signMsiWindowsArm64
);

exports.bundleWindows = series(bundleWinInstallers, signWinBundle);

exports.buildMacOSArm64 = series(cleanMacArm64, runPkgMacArm64, copyDepsMacArm64, copyAssetsMacArm64);

exports.buildMacOSIntel64 = series(cleanMacIntel64, runPkgMacIntel64, copyDepsMacIntel64, copyAssetsMacIntel64);

exports.buildLinuxIntel64 = series(cleanLinuxIntel64, runPkgLinuxIntel64, copyDepsLinuxIntel64, copyAssetsLinuxIntel64);

exports.buildLinuxArm64 = series(cleanLinuxArm64, runPkgLinuxArm64, copyDepsLinuxArm64, copyAssetsLinuxArm64);

exports.clean = series(
    cleanDist,
    cleanLinuxArm64,
    cleanLinuxIntel64,
    cleanMacArm64,
    cleanMacIntel64,
    cleanWin64,
    cleanWindowsArm64,
    cleanMacOSInstaller
);

exports.postCodegen = function () {
    fs.copyFileSync(
        path.join("src", "generated", "graphql.ts"),
        path.join("test", "integration", "registry-client.ts")
    );

    return Promise.resolve();
};
