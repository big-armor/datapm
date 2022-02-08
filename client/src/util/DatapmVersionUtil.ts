import fs from "fs";
import path from "path/posix";
import os from "os";

let datapmVersionPrinted = false;

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
export function printDataPMVersion(argv: any): void {
    if (!datapmVersionPrinted && argv.quiet === undefined) {
        const version = readDataPMVersion();

        console.log("");
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        console.log("datapm client version " + version + " on " + os.platform + "-" + os.arch);
        console.log("");
        datapmVersionPrinted = true;
    }
}

export function readDataPMVersion(): string {
    let currentDirectory = __dirname;

    let lastDirectory = "asdfas";
    while (currentDirectory !== lastDirectory) {
        if (fs.existsSync(path.join(currentDirectory, "package.json"))) {
            const packageContents = fs.readFileSync(path.join(currentDirectory, "package.json"));
            const packageJson = JSON.parse(packageContents.toString());
            return packageJson.version;
        }
        lastDirectory = currentDirectory;
        currentDirectory = path.resolve(currentDirectory, "..");
    }

    throw new Error("Could not find package.json");
}
