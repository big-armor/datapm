import { getPackageFromUrl, JobContext, PackageFileWithContext, PackageIdentifierInput } from "datapm-client-lib";
import { loadPackageFileFromDisk } from "datapm-lib";
import { LocalPackageFileContext } from "./LocalPackageFileContext";
import fs from "fs";
import path from "path";
import os from "os";
import { SemVer } from "semver";

export async function getPackage(
    jobContext: JobContext,
    identifier: string,
    modifiedOrCanonical: "modified" | "canonicalIfAvailable"
): Promise<PackageFileWithContext> {
    if (identifier.startsWith("local/")) {
        const packageIdentifier: PackageIdentifierInput = {
            catalogSlug: identifier.split("/")[0],
            packageSlug: identifier.split("/")[1]
        };

        try {
            identifier = getLocalPackageLatestVersionPath(packageIdentifier.packageSlug);
        } catch (e) {
            throw new Error("Local package " + packageIdentifier.packageSlug + " not found. Error: " + e.message);
        }
    }

    if (fs.existsSync(identifier)) {
        const packageFile = loadPackageFileFromDisk(identifier);
        let pathToPackageFile = path.dirname(identifier);

        if (!path.isAbsolute(identifier)) {
            pathToPackageFile = process.cwd();
            const directory = path.dirname(identifier);

            if (directory !== ".") {
                pathToPackageFile += path.sep + directory;
            }
        }
        const packageFileName = path.basename(identifier);

        const filePath = path.join(pathToPackageFile, packageFileName);

        return new LocalPackageFileContext(jobContext, packageFile, filePath, "local");
    } else {
        return getPackageFromUrl(jobContext, identifier, modifiedOrCanonical);
    }
}

export function getDataPMHomePath(): string {
    return path.join(os.homedir(), "datapm", "data");
}

export function getLocalPackageLatestVersionPath(packageSlug: string): string {
    let basePath = path.join(getDataPMHomePath(), "local", packageSlug);

    if (!fs.existsSync(basePath)) throw new Error("directory " + basePath + " does not exist");

    // Find the latest package file from the directory
    const versionDirectories = fs
        .readdirSync(basePath, {
            withFileTypes: true
        })
        .filter((d) => d.isDirectory())
        .filter((d) => !isNaN(Number.parseInt(d.name)))
        .map((d) => Number.parseInt(d.name))
        .sort();

    const mostRecentVersion = versionDirectories[versionDirectories.length - 1];

    basePath = path.join(basePath, mostRecentVersion.toString());

    const packageFiles = fs
        .readdirSync(basePath, {
            withFileTypes: true
        })
        .filter((d) => d.isFile())
        .filter((f) => f.name.toLowerCase().endsWith(".datapm.json"))
        .filter((f) => {
            const filePath = path.join(basePath, f.name);

            try {
                loadPackageFileFromDisk(filePath);
                return true;
            } catch (e) {
                console.error("Error reading package file " + filePath + ": " + e.message);
                return false;
            }
        })
        .map((f) => {
            const filePath = path.join(basePath, f.name);
            const packageFile = loadPackageFileFromDisk(filePath);
            const version = new SemVer(packageFile.version);
            return {
                packageFile: loadPackageFileFromDisk(filePath),
                version,
                filePath
            };
        })
        .sort((a, b) => {
            return a.version.compare(b.version);
        });

    const latestVersion = packageFiles[packageFiles.length - 1];

    return latestVersion.filePath;
}
