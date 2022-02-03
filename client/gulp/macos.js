/* eslint-disable @typescript-eslint/no-var-requires */
const { runPkg, cleanDir, copyDeps, copyAssets } = require("./common");
const path = require("path");

/** Mac 64 Bit Intel */
exports.runPkgMacIntel64 = function () {
    return runPkg("macos", "x64", "pkg-mac-intel64");
};

exports.cleanMacIntel64 = function () {
    return cleanDir("pkg-mac-intel64");
};

exports.copyDepsMacIntel64 = function () {
    return copyDeps("pkg-mac-intel64");
};

exports.copyAssetsMacIntel64 = function () {
    return copyAssets("pkg-mac-intel64");
};

/** Arm 64 Bit */
exports.runPkgMacArm64 = function () {
    return runPkg("macos", "arm64", "pkg-mac-arm64");
};

exports.cleanMacArm64 = function () {
    return cleanDir("pkg-mac-arm64");
};

exports.copyDepsMacArm64 = function () {
    return copyDeps("pkg-mac-arm64");
};

exports.copyAssetsMacArm64 = function () {
    return copyAssets("pkg-mac-arm64");
};

exports.cleanMacOSInstaller = function () {
    cleanDir(path.join("installers", "macos", "macOS-x64", "target"));
    return cleanDir(path.join("installers", "macos", "macOS-x64", "application"));
};
