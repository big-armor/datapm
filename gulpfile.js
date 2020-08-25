const { series, src, dest } = require("gulp");
const exec = require("child_process").exec;
const path = require("path");

const DESTINATION_DIR = path.join(__dirname, "dist");
console.log(DESTINATION_DIR);

function copy() {
  return src([
    "package*.json",
  ]).pipe(dest(path.join(DESTINATION_DIR, "src")));
}

function copyOthers() {
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

function pushToGCR() {
  return exec("docker push gcr.io/datapm-test-terraform/datapm-registry:latest")
}

function terraFormApply() {
  return exec("terraform appy -auto-approve")
}

exports.default = series(copy, copyOthers, copyModules);
exports.local = series(copy, copyOthers, copyModules);
exports.deploy = series(buildDockerImage,tagDockerImage,pushToGCR,terraFormApply)