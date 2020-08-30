const { series, src, dest } = require("gulp");
const exec = require("child_process").exec;
const spawn = require("child_process").spawn;

const path = require("path");

const DESTINATION_DIR = path.join(__dirname, "dist");
console.log(DESTINATION_DIR);

function installBackendDepdendencies() {
  return spawnAndLog("npm",["ci"], {cwd: "backend"});
}

function buildBackend() {
  return spawnAndLog("npm",["run","build"], {cwd: "backend"});
}

function installFrontendDepdendencies() {
  return spawnAndLog("npm",["ci"], {cwd: "frontend"});
}

function buildFrontend() {
  return spawnAndLog("npm",["run","build"], {cwd: "frontend"});
}

function buildDockerImage() {
  return spawnAndLog("docker", ["build","-t","datapm-registry", ".", "--no-cache"])
}

function tagDockerImage() {
  return spawnAndLog("docker", ["tag","datapm-registry", "gcr.io/datapm-test-terraform/datapm-registry:latest"])
}

function pushToGCR() {
  return spawnAndLog("docker", ["push", "gcr.io/datapm-test-terraform/datapm-registry:latest"])
}

function spawnAndLog(command,args,opts) {
  const child = spawn(command,args,opts)
  
  child.stdout.on('data', function(chunk) {
    console.log(chunk.toString())
  });

  child.stderr.on('data', function(chunk) {
    console.error(chunk.toString())
  });

  return child;
}

exports.default = series(
  buildDockerImage
);

exports.deployDockerImage = series(
  tagDockerImage,
  pushToGCR
);
