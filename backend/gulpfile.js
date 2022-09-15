const { series, src, dest } = require("gulp");
const exec = require("child_process").exec;
const path = require("path");
const through = require("through2");
const fs = require("fs");
const { join } = require("path/posix");
const JSZip = require("jszip");

const DESTINATION_DIR = path.join(__dirname, "dist");
const SCHEMA_DIR = path.join(__dirname, "node_modules", "datapm-lib");
const CLIENT_LIB_DIR = path.join(__dirname, "..", "client-lib");
function copyFiles() {
    return src([
        "ormconfig.js",
        "startServer.sh",
        "package.json",
        "static" + path.sep + "robots.txt",
        "static" + path.sep + "robots-production.txt",
        "package-lock.json",
        path.join(SCHEMA_DIR, "schema.gql"),
        path.join(SCHEMA_DIR, "auth-schema.gql"),
        path.join(SCHEMA_DIR, "user-schema.gql"),
        path.join(SCHEMA_DIR, "api-key-schema.gql"),
        path.join(SCHEMA_DIR, "images-schema.gql"),
        path.join(SCHEMA_DIR, "group-schema.gql")
    ]).pipe(dest(DESTINATION_DIR));
}

function readPackageVersion() {
    const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
    return packageJson.version;
}

function copyEmailTemplates() {
    return src([path.join("static", "email-templates", "*")]).pipe(
        dest(path.join(DESTINATION_DIR, "static", "email-templates"))
    );
}

function createTerraformScriptsDirectory() {
    const scriptsPath = path.join("dist", "static", "terraform-scripts");
    if (!fs.existsSync(scriptsPath)) {
        fs.mkdirSync(scriptsPath, {
            recursive: true
        });
    }

    return Promise.resolve();
}

async function createGCPTerraformScriptZip() {
    const zip = new JSZip();

    const mainTfContents = fs.readFileSync(path.join("..", "terraform", "main.tf"), "utf-8");
    const secretsExampleContents = fs.readFileSync(path.join("..", "terraform", "environment-example.tfvars"), "utf-8");
    const backendConfigContents = fs.readFileSync(path.join("..", "terraform", "backend-example.config"), "utf-8");

    zip.file("main.tf", mainTfContents);
    zip.file("environment-example.tfvars", secretsExampleContents);
    zip.file("backend-example.config", backendConfigContents);

    const zipContent = await zip.generateAsync({ type: "uint8array" });

    const destinationZipFile = path.join(
        "dist",
        "static",
        "terraform-scripts",
        "datapm-gcp-terraform-" + readPackageVersion() + ".zip"
    );

    fs.writeFileSync(destinationZipFile, zipContent);
}

function linkDataPMClientLib() {
    const libPath = path.join(__dirname, "dist", "node_modules");
    if (!fs.existsSync(libPath)) {
        fs.mkdirSync(libPath, { recursive: true });
    }

    const targetPath = path.join(libPath, "datapm-client-lib");
    if (!fs.existsSync(targetPath)) {
        fs.symlinkSync(path.join(__dirname, "..", "client-lib", "dist"), targetPath, "dir");
    }

    return Promise.resolve();
}

/** The TypeORM distribution is way too big. Slim to make it much smaller */
function slimTypeOrmDist() {
    const deleteDirectory = function (directory) {
        const typeOrmDir = path.join("dist", "node_modules", "typeorm");
        fs.rmSync(path.join(typeOrmDir, directory), {
            force: true,
            recursive: true
        });
    };

    deleteDirectory("browser");
    deleteDirectory("aurora-data-api*");
    deleteDirectory("cockroachdb");
    deleteDirectory("cordova");
    deleteDirectory("expo");
    deleteDirectory("mysql");
    deleteDirectory("mongodb");
    deleteDirectory("react-native");
    deleteDirectory("sap");
    deleteDirectory("sqlite*");
    deleteDirectory("sqljs");
    deleteDirectory("sqlserver");

    return Promise.resolve();
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

function linkDataPMLib() {
    const libPath = path.join(__dirname, "dist", "node_modules");
    if (!fs.existsSync(libPath)) {
        fs.mkdirSync(libPath, { recursive: true });
    }

    const targetPath = path.join(libPath, "datapm-lib");
    if (!fs.existsSync(targetPath)) {
        fs.symlinkSync(path.join(__dirname, "..", "lib", "dist"), targetPath, "dir");
    }

    return Promise.resolve();
}

exports.default = series(
    createTerraformScriptsDirectory,
    createGCPTerraformScriptZip,
    copyFiles,
    copyEmailTemplates,
    linkDataPMClientLib,
    linkDataPMLib,
    slimTypeOrmDist
);
exports.linkDataPMClientLib = linkDataPMClientLib;
exports.linkDataPMLib = linkDataPMLib;
exports.clean = clean;
