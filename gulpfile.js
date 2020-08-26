const { series, src, dest } = require("gulp");
const exec = require("child_process").exec;
const path = require("path");

const DESTINATION_DIR = path.join(__dirname, "dist");
console.log(DESTINATION_DIR);

function copyFiles() {
  return src([
    "ormconfig.js",
    path.join(__dirname, "src", "schema.gql"),
  ]).pipe(dest(DESTINATION_DIR));
}

function copyModules() {
  return exec("npx distize --no-files");
}

function buildDockerImage() {
  return exec("docker build -t datapm-registry .")
}

function tagDockerImage() {
  return exec("docker tag datapm-registry gcr.io/datapm-test-terraform/datapm-registry:latest")
}

function authorizeGCR() {
  return exec("gcloud auth configure-docker --quiet")
}

function pushToGCR() {
  return exec("docker push gcr.io/datapm-test-terraform/datapm-registry:latest")
}

function terraFormApply() {
  return exec("terraform apply -auto-approve")
}

exports.default = series(copyFiles,copyModules,buildDockerImage);
exports.deploy = series(tagDockerImage,authorizeGCR,pushToGCR,terraFormApply)