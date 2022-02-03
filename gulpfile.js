/* eslint-disable @typescript-eslint/no-var-requires */
const { series, src, dest, parallel } = require("gulp");
const spawn = require("child_process").spawn;
const fs = require("fs");
const merge = require("merge-stream");

const path = require("path");

const DESTINATION_DIR = path.join(__dirname, "dist");
console.log(DESTINATION_DIR);

function readPackageVersion() {
    const fileContents = fs.readFileSync("package.json");
    const packageFile = JSON.parse(fileContents);
    return packageFile.version;
}

function installRootDependencies() {
    return spawnAndLog("root-deps", "npm", ["ci"]);
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

function installClientDependencies() {
    return spawnAndLog("client-deps", "npm", ["ci"], { cwd: "client" });
}

function buildDocs() {
    return spawnAndLog("docs-build", "npm", ["run", "build"], { cwd: "docs/website" });
}

function buildRegistryDockerImage() {
    return spawnAndLog("registry-docker-build", "docker", [
        "build",
        "-t",
        "datapm-registry",
        "./dist",
        "-f",
        "docker/Dockerfile"
    ]);
}

/* function buildClientDockerImage() {
    return spawnAndLog("client-docker-build", "docker", [
        "build",
        "-t",
        "datapm-client",
        "./client/dist",
        "-f",
        "client/docker/Dockerfile"
    ]);
} */

function buildClient() {
    return spawnAndLog("client-build", "npm", ["run", "build"], { cwd: "client" });
}

function bumpRootVersion() {
    return spawnAndLog("bump-root-version", "npm", ["version", "patch", "--no-git-tag-version"]);
}

function bumpLibVersion() {
    return spawnAndLog("bump-lib-version", "npm", ["version", readPackageVersion(), "--no-git-tag-version"], {
        cwd: "lib"
    });
}

function bumpClientVersion() {
    return spawnAndLog("bump-client-version", "npm", ["version", readPackageVersion()], { cwd: "client" });
}

function bumpBackendVersion() {
    return spawnAndLog("bump-backend-version", "npm", ["version", readPackageVersion()], { cwd: "backend" });
}

function bumpFrontendVersion() {
    return spawnAndLog("bump-frontend-version", "npm", ["version", readPackageVersion()], { cwd: "frontend" });
}

function tagRegistryGCRDockerImageVersion() {
    return spawnAndLog("registry-docker-tag", "docker", [
        "tag",
        "datapm-registry",
        "gcr.io/datapm-test-terraform/datapm-registry:" + readPackageVersion()
    ]);
}

function tagRegistryGCRDockerImageLatest() {
    return spawnAndLog("registry-docker-tag", "docker", [
        "tag",
        "datapm-registry",
        "gcr.io/datapm-test-terraform/datapm-registry:latest"
    ]);
}

function pushRegistryGCRImage() {
    return spawnAndLog("registry-docker-push-gcr", "docker", [
        "push",
        "gcr.io/datapm-test-terraform/datapm-registry:" + readPackageVersion()
    ]);
}

function pushRegistryGCRImageLatest() {
    return spawnAndLog("registry-docker-push-gcr", "docker", [
        "push",
        "gcr.io/datapm-test-terraform/datapm-registry:latest"
    ]);
}

function tagRegistryDockerImageLatest() {
    return spawnAndLog("registry-docker-tag", "docker", ["tag", "datapm-registry", "datapm/datapm-registry:latest"]);
}

function tagRegistryDockerImageVersion() {
    return spawnAndLog("registry-docker-tag", "docker", [
        "tag",
        "datapm-registry",
        "datapm/datapm-registry:" + readPackageVersion()
    ]);
}

/* 
function tagClientDockerImageLatest() {
    return spawnAndLog("client-docker-tag", "docker", ["tag", "datapm-client", "datapm/datapm-client:latest"]);
}

function tagClientDockerImageVersion() {
    return spawnAndLog("client-docker-tag", "docker", [
        "tag",
        "datapm-client",
        "datapm/datapm-client:" + readPackageVersion()
    ]);
}

*/
function pushRegistryDockerImage() {
    return spawnAndLog("registry-docker-push-docker", "docker", [
        "push",
        "datapm/datapm-registry:" + readPackageVersion()
    ]);
}

function pushRegistryDockerImageLatest() {
    return spawnAndLog("registry-docker-push-docker", "docker", ["push", "datapm/datapm-registry:latest"]);
}

/* 
function pushClientDockerImage() {
    return spawnAndLog("client-docker-push-docker", "docker", ["push", "datapm/datapm-client:" + readPackageVersion()]);
}

function pushClientDockerImageLatest() {
    return spawnAndLog("client-docker-push-docker", "docker", ["push", "datapm/datapm-client:latest"]);
}
*/

function gitTag() {
    return spawnAndLog("git-tag", "git", ["tag", "-a", readPackageVersion(), "-m", "Release " + readPackageVersion()]);
}

function gitStageChanges() {
    return spawnAndLog("git-stage", "git", ["add", "-A"]);
}

function gitCommit() {
    return spawnAndLog("git-commit", "git", ["commit", "-m", "Commit after version bump to" + readPackageVersion()]);
}

function gitPush() {
    return spawnAndLog("git-push", "git", ["push"]);
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

/** Tasks that must be completed before running the docker file. The docker file's build
 * context is the "dist" directory in the root project folder.
 */
function prepareRegistryDockerBuildAssets() {
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

function cleanRoot() {
    return new Promise((resolve) => {
        if (fs.existsSync("dist")) fs.rmSync("dist", { recursive: true, force: true });

        resolve();
    });
}

function cleanLib() {
    return spawnAndLog("clean-lib", "npm", ["run", "clean"]);
}

exports.default = series(
    installLibDependencies,
    buildLib,
    //   testLib,
    installBackendDependencies,
    buildBackend,
    //   testBackend,
    installFrontendDependencies,
    buildFrontend,
    //   testFrontend,
    installDocsDependencies,
    buildDocs,
    prepareRegistryDockerBuildAssets,
    buildRegistryDockerImage,
    installClientDependencies,
    buildClient
    //   buildClientDockerImage
);

exports.buildParallel = series(
    series(installLibDependencies, parallel(buildLib, testLib)),
    parallel(
        series(installBackendDependencies, parallel(buildBackend, testBackend)),
        series(installFrontendDependencies, parallel(buildFrontend, testFrontend)),
        series(installDocsDependencies, buildDocs),
        series(installClientDependencies, buildClient) // buildClientDockerImage
    ),
    series(prepareRegistryDockerBuildAssets, buildRegistryDockerImage)
);

exports.bumpVersion = series(
    showGitDiff,
    bumpRootVersion,
    bumpLibVersion,
    bumpClientVersion,
    bumpBackendVersion,
    bumpFrontendVersion
);

exports.gitTag = series(gitTag, gitPush);
exports.gitCommitPush = series(gitStageChanges, gitCommit, gitPush);
exports.deployAssets = series(
    // libPublish, // current done in the github action
    tagRegistryGCRDockerImageLatest,
    tagRegistryGCRDockerImageVersion,
    tagRegistryDockerImageLatest,
    tagRegistryDockerImageVersion,
    // tagClientDockerImageLatest,
    // tagClientDockerImageVersion,
    pushRegistryGCRImage,
    pushRegistryGCRImageLatest,
    pushRegistryDockerImage,
    pushRegistryDockerImageLatest
    // pushClientDockerImage,
    // pushClientDockerImageLatest
);

exports.buildRegistryDockerImage = series(prepareRegistryDockerBuildAssets, buildRegistryDockerImage);

exports.prepareDevEnvironment = series(
    installRootDependencies,
    installLibDependencies,
    buildLib,
    installBackendDependencies,
    installFrontendDependencies,
    installDocsDependencies,
    installClientDependencies,
    buildBackend
);

exports.clean = series(cleanLib, cleanRoot);
