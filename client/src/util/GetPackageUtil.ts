import { getPackageFromUrl, JobContext, PackageFileWithContext, PackageIdentifierInput } from "datapm-client-lib";
import { loadPackageFileFromDisk } from "datapm-lib";
import { LocalPackageFileContext } from "./LocalPackageFileContext";
import fs from "fs";
import path from "path";

export async function getPackage(
    jobContext: JobContext,
    identifier: string | PackageIdentifierInput,
    modifiedOrCanonical: "modified" | "canonicalIfAvailable"
): Promise<PackageFileWithContext> {
    if (typeof identifier === "string" && fs.existsSync(identifier)) {
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

        const filePAth = path.join(pathToPackageFile, packageFileName);

        return new LocalPackageFileContext(jobContext, packageFile, filePAth);
    } else {
        return getPackageFromUrl(jobContext, identifier, modifiedOrCanonical);
    }
}
