/* eslint-disable @typescript-eslint/no-var-requires */
const { series, src, dest } = require("gulp");
const path = require("path");
const fs = require("fs");

const DESTINATION_DIR = path.join(__dirname, "dist");

function copyRootFiles() {
    return src([
        "../docker/docker-compose.yml",
        "../docker/Docker-env",
        "*.gql",
        "README.md",
        "LICENSE",
        "packageFileSchema-*.json",
        "package.json",
        "package-lock.json"
    ]).pipe(dest(DESTINATION_DIR));
}
function copyGraphDocumentFiles() {
    return src(["graphql-documents/**"]).pipe(dest(path.join(DESTINATION_DIR, "graphql-documents")));
}

function clean() {
    return new Promise((resolve) => {
        if (fs.existsSync("dist")) fs.rmSync("dist", { recursive: true, force: true });

        resolve();
    });
}

function modifyPackagefile() {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, "dist", "package.json"), "utf8"));

    packageJson.main = "src/main.js";

    fs.writeFileSync(path.join("dist", "package.json"), JSON.stringify(packageJson, null, 2));

    return Promise.resolve();
}

async function createDataPMVersionFile() {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, "package.json"), "utf8"));

    fs.writeFileSync(
        path.join(__dirname, "src", "DataPMVersion.ts"),
        `export const DATAPM_VERSION = "${packageJson.version}";\n`
    );
}

exports.codegen = createDataPMVersionFile;
exports.default = series(createDataPMVersionFile, copyRootFiles, copyGraphDocumentFiles, modifyPackagefile);
exports.clean = clean;
