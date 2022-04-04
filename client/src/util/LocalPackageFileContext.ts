import { PackageFile } from "datapm-lib";
import { Writable } from "stream";
import { JobContext, CantSaveReasons } from "datapm-client-lib";
import { PackageFileWithContext } from "datapm-client-lib/src/util/PackageContext";
import fs from "fs";
import path from "path";

export class LocalPackageFileContext implements PackageFileWithContext {
    // eslint-disable-next-line no-useless-constructor
    constructor(public jobContext: JobContext, public packageFile: PackageFile, public packageFilePath: string) {}

    get contextType(): "localFile" {
        return "localFile";
    }

    get permitsSaving(): boolean {
        return true;
    }

    get hasPermissionToSave(): boolean {
        const fileStats = fs.statSync(this.packageFileUrl);

        return !!parseInt((fileStats.mode & parseInt("777", 8)).toString(8)[0]);
    }

    get cantSaveReason(): CantSaveReasons | false {
        if (!this.hasPermissionToSave) {
            return "NOT_AUTHORIZED";
        }

        return false;
    }

    get packageFileUrl(): string {
        return this.packageFilePath;
    }

    get readmeFileUrl(): string | undefined {
        return this.packageFile.readmeFile ? "file://" + this.packageFile.readmeFile : undefined;
    }

    get licenseFileUrl(): string | undefined {
        return this.packageFile.licenseFile ? "file://" + this.packageFile.licenseFile : undefined;
    }

    async save(packageFile: PackageFile): Promise<void> {
        let task = await this.jobContext.startTask("Writing README file...");
        try {
            const readmeFileLocation = await writeReadmeFile(undefined, packageFile);
            await task.end("SUCCESS", `Wrote README file ${readmeFileLocation}`);
        } catch (error) {
            await task.end("ERROR", `Unable to write the README file: ${error.message}`);
            throw error;
        }

        task = await this.jobContext.startTask("Writing LICENSE file...");
        try {
            const licenseFileLocation = await writeLicenseFile(undefined, packageFile);
            await task.end("SUCCESS", `Wrote LICENSE file ${licenseFileLocation}`);
        } catch (error) {
            await task.end("ERROR", `Unable to write the LICENSE file: ${error.message}`);
            throw error;
        }

        task = await this.jobContext.startTask("Writing package file...");

        try {
            await writePackageFile(undefined, packageFile, this.packageFilePath);

            await task.end("SUCCESS", `Wrote package file ${this.packageFilePath}`);
        } catch (error) {
            await task.end("ERROR", `Unable to write the package file: ${error.message}`);
            throw error;
        }
    }
}

async function writePackageFile(
    catalogSlug: string | undefined,
    packageFile: PackageFile,
    path: string
): Promise<void> {
    const json = JSON.stringify(packageFile, null, " ");

    const writeStream = fs.createWriteStream(path);

    await writeFile(writeStream, json);
}

async function writeReadmeFile(catalogSlug: string | undefined, packageFile: PackageFile): Promise<string> {
    const contents =
        packageFile.readmeMarkdown != null
            ? packageFile.readmeMarkdown
            : `# ${packageFile.displayName}\n \n ${packageFile.description}`;

    const readmeFileLocation =
        packageFile.readmeFile != null
            ? packageFile.readmeFile
            : path.join(process.cwd(), packageFile.packageSlug + ".README.md");

    const writable = fs.createWriteStream(readmeFileLocation);

    await writeFile(writable, contents);

    delete packageFile.readmeMarkdown;

    return readmeFileLocation;
}

async function writeLicenseFile(catalogSlug: string | undefined, packageFile: PackageFile): Promise<string> {
    const contents =
        typeof packageFile.licenseMarkdown === "string"
            ? (packageFile.licenseMarkdown as string)
            : "# License\n\nLicense not defined. Contact author.";

    const licenseFileLocation =
        packageFile.licenseFile != null
            ? packageFile.licenseFile
            : path.join(process.cwd(), packageFile.packageSlug + ".LICENSE.md");

    const writable = fs.createWriteStream(licenseFileLocation);

    await writeFile(writable, contents);

    delete packageFile.licenseMarkdown;

    return licenseFileLocation;
}

async function writeFile(writable: Writable, contents: string) {
    return new Promise<void>((resolve, reject) => {
        writable.write(contents, (err) => {
            writable.end();
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}
