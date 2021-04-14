/* eslint-disable @typescript-eslint/no-var-requires */
const { series, src, dest, parallel } = require("gulp");
const spawn = require("child_process").spawn;
const fs = require("fs");
const through = require("through2");
const merge = require("merge-stream");

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
    return spawnAndLog("docker-build", "docker", [
        "build",
        "-t",
        "datapm-registry",
        "./dist",
        "-f",
        "docker/Dockerfile"
    ]);
}

function bumpRootVersion() {
    return spawnAndLog("bump-root-version", "npm", ["version", "patch"]);
}

function bumpLibVersion() {
    return spawnAndLog("bump-lib-version", "npm", ["version", readPackageVersion()], { cwd: "lib" });
}

function tagGCRDockerImageVersion() {
    return spawnAndLog("docker-tag", "docker", [
        "tag",
        "datapm-registry",
        "gcr.io/datapm-test-terraform/datapm-registry:" + readPackageVersion()
    ]);
}

function tagGCRDockerImageLatest() {
    return spawnAndLog("docker-tag", "docker", [
        "tag",
        "datapm-registry",
        "gcr.io/datapm-test-terraform/datapm-registry:latest"
    ]);
}

function pushGCRImage() {
    return spawnAndLog("docker-push-gcr", "docker", [
        "push",
        "gcr.io/datapm-test-terraform/datapm-registry:" + readPackageVersion()
    ]);
}

function pushGCRImageLatest() {
    return spawnAndLog("docker-push-gcr", "docker", ["push", "gcr.io/datapm-test-terraform/datapm-registry:latest"]);
}

function tagDockerImageLatest() {
    return spawnAndLog("docker-tag", "docker", ["tag", "datapm-registry", "datapm/datapm-registry:latest"]);
}

function tagDockerImageVersion() {
    return spawnAndLog("docker-tag", "docker", [
        "tag",
        "datapm-registry",
        "datapm/datapm-registry:" + readPackageVersion()
    ]);
}

function pushDockerImage() {
    return spawnAndLog("docker-push-docker", "docker", ["push", "datapm/datapm-registry:" + readPackageVersion()]);
}

function pushDockerImageLatest() {
    return spawnAndLog("docker-push-docker", "docker", ["push", "datapm/datapm-registry:latest"]);
}

function gitPushTag() {
    return spawnAndLog("git-tag-push", "git", ["push", "origin", "v" + readPackageVersion()]);
}

function gitStageChanges() {
    return spawnAndLog("git-stage", "git", ["add", "-A"]);
}

function gitCommit() {
    return spawnAndLog("git-commit", "git", ["commit", "-m 'Commit after version bump during build [ci skip]'"]);
}

function gitPush() {
    return spawnAndLog("git-push", "git", ["push"]);
}

/* function libPublish() {
    return spawnAndLog("lib-publish", "npm", ["publish"], { cwd: "lib" });
} */

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

/** Tasks that must be completed before running the docker file. The docker file's build
 * context is the "dist" directory in the root project folder.
 */
function prepareDockerBuildAssets() {
    const task1 = src(["backend/package.json", "backend/package-lock.json", "backend/gulpfile.js"]).pipe(
        dest(path.join(DESTINATION_DIR, "backend"))
    );

    const task2 = src(["lib/dist/**"]).pipe(dest(path.join(DESTINATION_DIR, "lib", "dist")));

    const task3 = src(["backend/dist/**", "!backend/dist/node_modules/**"]).pipe(
        dest(path.join(DESTINATION_DIR, "backend", "dist"))
    );

    const task4 = src(["frontend/dist/**"]).pipe(dest(path.join(DESTINATION_DIR, "frontend")));
    const task5 = src(["docs/website/build/datapm/**"]).pipe(dest(path.join(DESTINATION_DIR, "docs")));

    return merge(task1, task2, task3, task4, task5);
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
    prepareDockerBuildAssets,
    buildDockerImage
);

exports.buildParallel = series(
    series(installLibDependencies, parallel(buildLib, testLib)),
    parallel(
        series(installBackendDependencies, parallel(buildBackend, testBackend)),
        series(installFrontendDependencies, parallel(buildFrontend, testFrontend)),
        series(installDocsDependencies, buildDocs)
    ),
    prepareDockerBuildAssets,
    buildDockerImage
);

exports.bumpVersion = series(showGitDiff, bumpRootVersion, bumpLibVersion);
exports.gitPushTag = series(gitStageChanges, gitCommit, gitPush, gitPushTag);
exports.deployAssets = series(
    // libPublish, // current done in the github action
    tagGCRDockerImageLatest,
    tagGCRDockerImageVersion,
    tagDockerImageLatest,
    tagDockerImageVersion,
    pushGCRImage,
    pushGCRImageLatest,
    pushDockerImage,
    pushDockerImageLatest
);

exports.buildBackend = buildBackend;
exports.buildDockerImage = series(prepareDockerBuildAssets, buildDockerImage);
exports.prepareDockerBuildAssets = prepareDockerBuildAssets;
