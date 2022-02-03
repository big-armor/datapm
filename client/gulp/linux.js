/* eslint-disable @typescript-eslint/no-var-requires */
const { runPkg, cleanDir, copyDeps, copyAssets } = require("./common");

/** Linux 64 Bit Intel */
exports.runPkgLinuxIntel64 = function () {
    return runPkg("linux", "x64", "pkg-linux-intel64");
};

exports.cleanLinuxIntel64 = function () {
    return cleanDir("pkg-linux-intel64");
};

exports.copyDepsLinuxIntel64 = function () {
    return copyDeps("pkg-linux-intel64");
};

exports.copyAssetsLinuxIntel64 = function () {
    return copyAssets("pkg-linux-intel64");
};

/** Arm 64 Bit */
exports.runPkgLinuxArm64 = function () {
    return runPkg("linux", "arm64", "pkg-linux-arm64");
};

exports.cleanLinuxArm64 = function () {
    return cleanDir("pkg-linux-arm64");
};

exports.copyDepsLinuxArm64 = function () {
    return copyDeps("pkg-linux-arm64");
};

exports.copyAssetsLinuxArm64 = function () {
    return copyAssets("pkg-linux-arm64");
};
