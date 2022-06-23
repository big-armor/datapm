import { PackageFile } from "datapm-lib";
import { Writable } from "stream";
import { JobContext, CantSaveReasons } from "datapm-client-lib";
import { PackageFileWithContext } from "datapm-client-lib/src/util/PackageContext";
import fs from "fs";
import os from "os";
import path from "path";
import { SemVer } from "semver";

export class LocalPackageFileContext implements PackageFileWithContext {
    // eslint-disable-next-line no-useless-constructor
    constructor(public jobContext: JobContext, public packageFile: PackageFile, public catalog: string) {}

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
        return this.basePath();
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
            const readmeFileLocation = await writeReadmeFile(this.basePath(), packageFile);
            await task.end("SUCCESS", `Wrote README file ${readmeFileLocation}`);
        } catch (error) {
            await task.end("ERROR", `Unable to write the README file: ${error.message}`);
            throw error;
        }

        task = await this.jobContext.startTask("Writing LICENSE file...");
        try {
            const licenseFileLocation = await writeLicenseFile(this.basePath(), packageFile);
            await task.end("SUCCESS", `Wrote LICENSE file ${licenseFileLocation}`);
        } catch (error) {
            await task.end("ERROR", `Unable to write the LICENSE file: ${error.message}`);
            throw error;
        }

        task = await this.jobContext.startTask("Writing package file...");

        try {
            const packageFileLocation = await writePackageFile(this.basePath(), packageFile);

            await task.end("SUCCESS", `Wrote package file ${packageFileLocation}`);
        } catch (error) {
            await task.end("ERROR", `Unable to write the package file: ${error.message}`);
            throw error;
        }
    }

    basePath(): string {
        const majorVersion = new SemVer(this.packageFile.version).major.toString();
        return path.join(os.homedir(), "datapm", "data", this.catalog, this.packageFile.packageSlug, majorVersion);
    }
}

async function writePackageFile(basePath: string, packageFile: PackageFile): Promise<string> {
    const json = JSON.stringify(packageFile, null, " ");

    if (!fs.existsSync(basePath)) fs.mkdirSync(basePath, { recursive: true });

    const packageFileLocation = path.join(
        basePath,
        packageFile.packageSlug + "-" + packageFile.version + ".datapm.json"
    );

    const writeStream = fs.createWriteStream(packageFileLocation);

    await writeFile(writeStream, json);

    return packageFileLocation;
}

async function writeReadmeFile(basePath: string, packageFile: PackageFile): Promise<string> {
    const contents =
        packageFile.readmeMarkdown != null
            ? packageFile.readmeMarkdown
            : `# ${packageFile.displayName}\n \n ${packageFile.description}`;

    const readmeFileLocation =
        packageFile.readmeFile != null
            ? packageFile.readmeFile
            : path.join(basePath, packageFile.packageSlug + ".README.md");

    const writable = fs.createWriteStream(readmeFileLocation);

    await writeFile(writable, contents);

    delete packageFile.readmeMarkdown;

    return readmeFileLocation;
}

async function writeLicenseFile(basePath: string, packageFile: PackageFile): Promise<string> {
    const contents =
        typeof packageFile.licenseMarkdown === "string"
            ? (packageFile.licenseMarkdown as string)
            : "# License\n\nLicense not defined. Contact author.";

    const licenseFileLocation =
        packageFile.licenseFile != null
            ? packageFile.licenseFile
            : path.join(basePath, packageFile.packageSlug + ".LICENSE.md");

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
