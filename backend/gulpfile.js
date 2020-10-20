const { series, src, dest } = require("gulp");
const exec = require("child_process").exec;
const path = require("path");

const DESTINATION_DIR = path.join(__dirname, "dist");
const SCHEMA_DIR = path.join(__dirname, "node_modules", "datapm-lib");

function copyFiles() {
    return src([
        "ormconfig.js",
        "package.json",
        "static/robots.txt",
        "static/robots-production.txt",
        "package-lock.json",
        path.join(SCHEMA_DIR, "schema.gql"),
        path.join(SCHEMA_DIR, "auth-schema.gql"),
        path.join(SCHEMA_DIR, "user-schema.gql"),
        path.join(SCHEMA_DIR, "api-key-schema.gql")
    ]).pipe(dest(DESTINATION_DIR));
}

function copyModules() {
    return exec("npx distize --no-files", execLogCb);
}

function execLogCb(err, stdout, stderr) {
    console.log(stdout); // outputs the normal messages
    console.log(stderr); // outputs the error messages
    return err; // makes gulp continue even if the command failed
}

exports.default = series(copyFiles, copyModules);
