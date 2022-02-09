const { series, src, dest } = require("gulp");
const exec = require("child_process").exec;
const path = require("path");
var through = require("through2");
const fs = require("fs");
const { join } = require("path/posix");
const JSZip = require("jszip");

const DESTINATION_DIR = path.join(__dirname, "dist");
const SCHEMA_DIR = path.join(__dirname, "node_modules", "datapm-lib");

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
        path.join(SCHEMA_DIR, "images-schema.gql")
    ]).pipe(dest(DESTINATION_DIR));
}

function readPackageVersion() {
    const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
    return packageJson.version;
}

function copyEmailTemplates() {
    return src([path.join("static","email-templates","*")]).pipe(dest(path.join(DESTINATION_DIR, "static", "email-templates")));
}

function copyModules() {
    return exec("npx copy-node-modules . dist", execLogCb);
}

function createTeraformScriptsDirectory() {

    const scriptsPath = path.join("dist","static","terraform-scripts");
    if(!fs.existsSync(scriptsPath)) {
        fs.mkdirSync(scriptsPath, {
            recursive: true
        });
    }

    return Promise.resolve();

}

async function createGCPTeraformScriptZip() {
   const zip = new JSZip();

    const mainTfContents = fs.readFileSync(path.join("..","main.tf"),"utf-8");

    zip.file("main.tf",mainTfContents);

    const zipContent = await zip.generateAsync({type: "uint8array"});

    const destinationZipFile = path.join("dist","static","terraform-scripts","datapm-gcp-terraform-" + readPackageVersion() + ".zip");

    fs.writeFileSync(destinationZipFile, zipContent);


}

function copyDataPMLib() {
   //  return exec("cp -R " + path.join("..","lib","dist") + path.join("dist","node_modules","datapm-lib"));

   return Promise.resolve();
}

/** The TypeORM distribution is way too big. Slim to make it much smaller */
function slimTypeOrmDist() {

    
    const deleteDirectory = function(directory) {
        const typeOrmDir = path.join("dist","node_modules","typeorm");
        fs.rmSync(path.join(typeOrmDir,directory),{
            force: true,
            recursive: true
        });

    }

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

exports.default = series(createTeraformScriptsDirectory, createGCPTeraformScriptZip, copyFiles, copyEmailTemplates, copyModules, copyDataPMLib, slimTypeOrmDist);
exports.copyDependencies = series(copyModules, copyDataPMLib);
exports.copyDataPMLib = copyDataPMLib;
exports.clean = clean;
