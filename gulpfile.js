const { fstat } = require("fs");
const { series, src, dest, parallel } = require("gulp");
const exec = require("child_process").exec;
const spawn = require("child_process").spawn;
const fs = require("fs");

const path = require("path");

const DESTINATION_DIR = path.join(__dirname, "dist");
console.log(DESTINATION_DIR);

function readPackageVersion() {
    const fileContents = fs.readFileSync("package.json");
    const packageFile = JSON.parse(fileContents);
    return packageFile.version;
}

function installLibDependencies() {
    return spawnAndLog("lib-deps", "npm", ["ci"], { cwd: "lib" });
}

function testLib() {
    return spawnAndLog("lib-test", "npm", ["run", "test"], { cwd: "lib" });
}

function buildLib() {
    return spawnAndLog("lib-build", "npm", ["run", "build"], { cwd: "lib" });
}

function installBackendDependencies() {
    return spawnAndLog("backend-deps", "npm", ["ci"], { cwd: "backend" });
}

function testBackend() {
    return spawnAndLog("backend-test", "npm", ["run", "test"], { cwd: "backend" });
}

function buildBackend() {
    return spawnAndLog("backend-build", "npm", ["run", "build"], { cwd: "backend" });
}

function installFrontendDependencies() {
    return spawnAndLog("frontend-deps", "npm", ["ci"], { cwd: "frontend" });
}

function testFrontend() {
    return spawnAndLog("frontend-test", "npm", ["run", "test:ci"], { cwd: "frontend" });
}

function buildFrontend() {
    return spawnAndLog("frontend-build", "npm", ["run", "build"], { cwd: "frontend" });
}

function installDocsDependencies() {
    return spawnAndLog("docs-deps", "npm", ["ci"], { cwd: "docs/website" });
}

function buildDocs() {
    return spawnAndLog("docs-build", "npm", ["run", "build"], { cwd: "docs/website" });
}

function buildDockerImage() {
    return spawnAndLog("docker-build", "docker", ["build", "-t", "datapm-registry", ".", "-f", "docker/Dockerfile"]);
}

function bumpRootVersion() {
    return spawnAndLog("bump-version", "npm", ["version", "patch"]);
}

function bumpLibVersion() {
    return spawnAndLog("bump-version", "npm", ["version", "patch", readPackageVersion()], { cwd: "lib" });
}

function tagGCRDockerImage() {
    return spawnAndLog("docker-tag", "docker", [
        "tag",
        "datapm-registry",
        "gcr.io/datapm-test-terraform/datapm-registry:" + readPackageVersion()
    ]);
}

function pushGCRImage() {
    return spawnAndLog("docker-push-gcr", "docker", [
        "push",
        "gcr.io/datapm-test-terraform/datapm-registry:" + readPackageVersion()
    ]);
}

function tagDockerImage() {
    return spawnAndLog("docker-tag", "docker", [
        "tag",
        "datapm-registry",
        "datapm/datapm-registry:" + readPackageVersion()
    ]);
}

function pushDockerImage() {
    return spawnAndLog("docker-push-docker", "docker", ["push", "datapm/datapm-registry:" + readPackageVersion()]);
}

function gitPushTag() {
    return spawnAndLog("git-tag-push", "git", ["push", "origin", "v" + readPackageVersion()]);
}

function spawnAndLog(prefix, command, args, opts) {
    const child = spawn(command, args, opts);

    child.stdout.on("data", function (chunk) {
        console.log("[" + prefix + "] " + chunk.toString());
    });

    child.stderr.on("data", function (chunk) {
        console.error("[" + prefix + "-err] " + chunk.toString());
    });

    return child;
}

function showGitDiff() {
    return spawnAndLog("git-diff", "git", ["diff"]);
}

exports.default = series(
    installLibDependencies,
    buildLib,
    testLib,
    installBackendDependencies,
    buildBackend,
    testBackend,
    installFrontendDependencies,
    buildFrontend,
    testFrontend,
    installDocsDependencies,
    buildDocs,
    buildDockerImage
);

exports.buildParallel = series(
    parallel(
        series(installBackendDependencies, buildBackend, testBackend),
        series(installFrontendDependencies, buildFrontend, testFrontend),
        series(installDocsDependencies, buildDocs)
    ),
    buildDockerImage
);

exports.bumpVersion = series(showGitDiff, bumpRootVersion, bumpLibVersion);
exports.gitPushTag = series(gitPushTag);
exports.deployDockerImages = series(tagGCRDockerImage, tagDockerImage, pushGCRImage, pushDockerImage);
exports.buildDockerImage = buildDockerImage;
