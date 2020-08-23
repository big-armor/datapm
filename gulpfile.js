const { series, src, dest } = require("gulp");
const exec = require("child_process").exec;
const path = require("path");

const DESTINATION_DIR = path.join(__dirname, "dist");
console.log(DESTINATION_DIR);

function copy() {
  return src([
    "package*.json",
    "ormconfig.js",
  ]).pipe(dest(path.join(DESTINATION_DIR, "src")));
}

function copyOthers() {
  return src([
    path.join(__dirname, "src", "schema.gql"),
  ]).pipe(dest(DESTINATION_DIR));
}

function npm() {
  return exec("npm ci --only=packageion", { cwd: DESTINATION_DIR });
}

exports.default = series(copy, copyOthers);
exports.local = series(copy, copyOthers);
exports.packageion = series(copy, copyOthers);
