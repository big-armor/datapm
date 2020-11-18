/* eslint-disable @typescript-eslint/no-var-requires */
const { series, src, dest } = require("gulp");
const exec = require("child_process").exec;
const path = require("path");

const DESTINATION_DIR = path.join(__dirname, "dist");

function copyFiles() {
    return new Promise((resolve) => {
        src(["*.gql", "README.md", "LICENSE", "packageFileSchema.json", "package.json", "package-lock.json"]).pipe(
            dest(DESTINATION_DIR)
        );

        src(["graphql-documents/**"]).pipe(dest(path.join(DESTINATION_DIR, "graphql-documents")));

        resolve();
    });
}

function copyModules() {
    return exec("npx copy-node-modules ./ dist/", execLogCb);
}

function execLogCb(err, stdout, stderr) {
    console.log(stdout); // outputs the normal messages
    console.log(stderr); // outputs the error messages
    return err; // makes gulp continue even if the command failed
}

exports.default = series(copyFiles, copyModules);
