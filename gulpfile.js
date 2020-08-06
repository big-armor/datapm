const { series, src, dest } = require("gulp");
const exec = require("child_process").exec;
const path = require("path");

const DESTINATION_DIR = path.join(__dirname, "dist", "src");
console.log(DESTINATION_DIR);

function copy() {
  return src([
    "package*.json",
    "ormconfig.js",
    path.join(__dirname, "src", "schema.gql"),
  ]).pipe(dest(DESTINATION_DIR));
}

function npm() {
  return exec("npm ci --only=packageion", { cwd: DESTINATION_DIR });
}

exports.default = series(copy, npm);
exports.local = series(copy, npm);
exports.packageion = series(copy, npm);
