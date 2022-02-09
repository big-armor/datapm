const { series, src, dest } = require("gulp");
const exec = require("child_process").exec;
const path = require("path");
var through = require("through2");
const fs = require("fs");

const DESTINATION_DIR = path.join(__dirname, "dist");
const SCHEMA_DIR = path.join(__dirname, "node_modules", "datapm-lib");

function copyFiles() {
    return src([
        "ormconfig.js",
        "startServer.sh",
        "package.json",
        "static/robots.txt",
        "static/robots-production.txt",
        "package-lock.json",
        path.join(SCHEMA_DIR, "schema.gql"),
        path.join(SCHEMA_DIR, "auth-schema.gql"),
        path.join(SCHEMA_DIR, "user-schema.gql"),
        path.join(SCHEMA_DIR, "api-key-schema.gql"),
        path.join(SCHEMA_DIR, "images-schema.gql")
    ]).pipe(dest(DESTINATION_DIR));
}

function readPackageVersion() {
    const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
    return packageJson.version;
}

function copyEmailTemplates() {
    return src(["static/email-templates/*"]).pipe(dest(path.join(DESTINATION_DIR, "static", "email-templates")));
}

function copyModules() {
    return exec("npx copy-node-modules ./ dist/", execLogCb);
}

function createTeraformScriptsDirectory() {
    return exec("mkdir -p " + path.join("dist","static","terraform-scripts"), execLogCb);
}

function createGCPTeraformScriptZip() {
    return exec("zip " + path.join("dist","static","terraform-scripts","datapm-gcp-terraform-" + readPackageVersion() + ".zip") + " ../main.tf");
}

function copyDataPMLib() {
    return exec("cp -R ../lib/dist dist/node_modules/datapm-lib");
}

function slimTypeOrmDist() {
    return exec(
        "rm -rf browser aurora-data-api* cockroachdb cordova expo mongodb mysql react-native sap sqlite* sqljs sqlserver",
        { cwd: "dist/node_modules/typeorm" }
    );
}

function execLogCb(err, stdout, stderr) {
    console.log(stdout); // outputs the normal messages
    console.log(stderr); // outputs the error messages
    return err; // makes gulp continue even if the command failed
}

function clean() {
    return new Promise((resolve) => {
        if (fs.existsSync("dist")) fs.rmSync("dist", { recursive: true, force: true });

        resolve();
    });
}

exports.default = series(createTeraformScriptsDirectory, createGCPTeraformScriptZip, copyFiles, copyEmailTemplates, copyModules, copyDataPMLib, slimTypeOrmDist);
exports.copyDependencies = series(copyModules, copyDataPMLib);
exports.clean = clean;
