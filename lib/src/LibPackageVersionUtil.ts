import fs from "fs";

/** Finds the package.json for this lib  */
export function libPackageVersion(): string {
    const dataLibPackageFile = fs.readFileSync("package.json");
    const dataLibPackageJSON = JSON.parse(dataLibPackageFile.toString());
    return dataLibPackageJSON.version;
}
