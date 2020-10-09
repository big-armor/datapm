const { series, src, dest } = require("gulp");
const exec = require("child_process").exec;
const path = require("path");
var del = require('del');

const DESTINATION_DIR = path.join(__dirname, "dist");
console.log(DESTINATION_DIR);

function moveBuiltFiles() {
  return src("dist/src/*").pipe(dest(DESTINATION_DIR));
}
function deleteBuildDirectories() {
  return   del(["dist/src","dist/test"]);
}

function copyResources() {
  return src([
    "ormconfig.js",
    "package.json",
    "static/robots.txt",
    "static/robots-production.txt",
    "package-lock.json",    
    path.join(__dirname, "node_modules", "datapm-lib", "schema.gql"),
  ]).pipe(dest(DESTINATION_DIR));
}

function copyModules() {
  return exec("npx distize --no-files",execLogCb);
}

function execLogCb(err, stdout, stderr) {
  console.log(stdout); // outputs the normal messages
  console.log(stderr); // outputs the error messages
  return err; // makes gulp continue even if the command failed
}



exports.default = series(moveBuiltFiles,deleteBuildDirectories,copyResources,copyModules);