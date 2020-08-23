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
  return src([
    path.join(__dirname, "node_modules","**/*"),
  ]).pipe(dest(path.join(DESTINATION_DIR, "node_modules")));
}

function npm() {
  return exec("npm ci --only=packageion", { cwd: DESTINATION_DIR });
}

exports.default = series(copy, copyOthers, copyModules);
exports.local = series(copy, copyOthers, copyModules);
exports.packageion = series(copy, copyOthers, copyModules);
