const { series, src, dest, parallel } = require("gulp");
const exec = require("child_process").exec;
const spawn = require("child_process").spawn;

const path = require("path");

const DESTINATION_DIR = path.join(__dirname, "dist");
console.log(DESTINATION_DIR);

function installBackendDepdendencies() {
    return spawnAndLog("backend-deps", "npm", ["ci"], { cwd: "backend" });
}

function testBackend() {
    return spawnAndLog("backend-test", "npm", ["run", "test"], { cwd: "backend" });
}

function buildBackend() {
    return spawnAndLog("backend-build", "npm", ["run", "build"], { cwd: "backend" });
}

function installFrontendDepdendencies() {
    return spawnAndLog("frontend-deps", "npm", ["ci"], { cwd: "frontend" });
}

function testFrontend() {
    return spawnAndLog("frontend-test", "npm", ["run", "test:ci"], { cwd: "frontend" });
}

function buildFrontend() {
    return spawnAndLog("frontend-build", "npm", ["run", "build"], { cwd: "frontend" });
}

function installDocsDepdendencies() {
    return spawnAndLog("docs-deps", "npm", ["ci"], { cwd: "docs/website" });
}

function buildDocs() {
    return spawnAndLog("docs-build", "npm", ["run", "build"], { cwd: "docs/website" });
}

function buildDockerImage() {
    return spawnAndLog("docker-build", "docker", [
        "build",
        "-t",
        "datapm-registry",
        ".",
        "-f",
        "docker/Dockerfile",
        "--no-cache"
    ]);
}

function tagGCRDockerImage() {
    return spawnAndLog("docker-tag", "docker", [
        "tag",
        "datapm-registry",
        "gcr.io/datapm-test-terraform/datapm-registry:latest"
    ]);
}

function pushGCRImage() {
    return spawnAndLog("docker-push-gcr", "docker", ["push", "gcr.io/datapm-test-terraform/datapm-registry:latest"]);
}

function tagDockerImage() {
    return spawnAndLog("docker-tag", "docker", ["tag", "datapm-registry", "datapm/datapm-registry:latest"]);
}

function pushDockerImage() {
    return spawnAndLog("docker-push-docker", "docker", ["push", "datapm/datapm-registry:latest"]);
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

exports.default = series(
    installBackendDepdendencies,
    buildBackend,
    testBackend,
    installFrontendDepdendencies,
    buildFrontend,
    testFrontend,
    installDocsDepdendencies,
    buildDocs,
    buildDockerImage
);

exports.buildParallel = series(
    parallel(
        series(installBackendDepdendencies, buildBackend, testBackend),
        series(installFrontendDepdendencies, buildFrontend, testFrontend),
        series(installDocsDepdendencies, buildDocs)
    ),
    buildDockerImage
);

exports.deployDockerImage = series(tagGCRDockerImage, tagDockerImage, pushGCRImage, pushDockerImage);
