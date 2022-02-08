import fs from "fs";
import path from "path/posix";

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
