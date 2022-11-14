import { PackageFile } from "datapm-lib";
import { JobContext, CantSaveReasons } from "datapm-client-lib";
import { PackageFileWithContext } from "datapm-client-lib/src/util/PackageContext";
import fs from "fs";
import os from "os";
import path from "path";
import { SemVer } from "semver";

export class LocalPackageFileContext implements PackageFileWithContext {
    // eslint-disable-next-line no-useless-constructor
    constructor(
        public jobContext: JobContext,
        public packageFile: PackageFile,
        public filePath: string | undefined,
        public catalogSlug: string | undefined
    ) {}

    get contextType(): "localFile" {
        return "localFile";
    }

    get permitsSaving(): boolean {
        return true;
    }

    get hasPermissionToSave(): boolean {
        const fileLocation = generatePackageFileLocation(this.basePath(), this.baseFileName());

        if (fs.existsSync(fileLocation)) {
            const fileStats = fs.statSync(fileLocation);

            return !!parseInt((fileStats.mode & parseInt("777", 8)).toString(8)[0]);
        } else {
            const dirName = path.dirname(fileLocation);

            if (!fs.existsSync(dirName)) fs.mkdirSync(dirName, { recursive: true });
            return true;
        }
    }

    get cantSaveReason(): CantSaveReasons | false {
        if (!this.hasPermissionToSave) {
            return "NOT_AUTHORIZED";
        }

        return false;
    }

    get packageReference(): string {
        if (this.catalogSlug === "local") return "local/" + this.packageFile.packageSlug;

        if (this.filePath == null) throw new Error("filePath not defined, and catalog is not local");

        return this.filePath;
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
            const readmeFileLocation = await this.writeReadmeFile(packageFile);
            await task.end("SUCCESS", `Wrote README file ${readmeFileLocation}`);
        } catch (error) {
            await task.end("ERROR", `Unable to write the README file: ${error.message}`);
            throw error;
        }

        task = await this.jobContext.startTask("Writing LICENSE file...");
        try {
            const licenseFileLocation = await this.writeLicenseFile(packageFile);
            await task.end("SUCCESS", `Wrote LICENSE file ${licenseFileLocation}`);
        } catch (error) {
            await task.end("ERROR", `Unable to write the LICENSE file: ${error.message}`);
            throw error;
        }

        task = await this.jobContext.startTask("Writing package file...");

        try {
            const packageFileLocation = await this.writePackageFile(packageFile);

            await task.end("SUCCESS", `Wrote package file ${packageFileLocation}`);
        } catch (error) {
            await task.end("ERROR", `Unable to write the package file: ${error.message}`);
            throw error;
        }
    }

    basePath(): string {
        if (this.filePath) {
            if (this.filePath.startsWith("~")) {
                this.filePath = this.filePath.replace(/^~/, os.homedir());
            }

            if (fs.existsSync(this.filePath)) {
                const stats = fs.statSync(this.filePath);

                if (stats.isDirectory()) {
                    return this.filePath;
                }
            }

            if (this.filePath.endsWith(".json")) return path.dirname(this.filePath);

            return this.filePath.replace(/[\\/]$/, ""); // remove ending separators
        }

        const majorVersion = new SemVer(this.packageFile.version).major.toString();
        return path.join(
            os.homedir(),
            "datapm",
            "data",
            this.catalogSlug ?? "local",
            this.packageFile.packageSlug,
            majorVersion
        );
    }

    baseFileName(): string {
        if (this.filePath) {
            if (fs.existsSync(this.filePath)) {
                const stats = fs.statSync(this.filePath);
                if (stats.isFile()) {
                    const parts = this.filePath.split(path.sep);
                    const fileName = parts[parts.length - 1];
                    return fileName.replace(".datapm.json", "");
                }
            }
        }

        return this.packageFile.packageSlug + "-" + this.packageFile.version;
    }

    async writePackageFile(packageFile: PackageFile): Promise<string> {
        const json = JSON.stringify(packageFile, null, " ");

        if (!fs.existsSync(this.basePath())) fs.mkdirSync(this.basePath(), { recursive: true });

        const packageFileLocation = generatePackageFileLocation(this.basePath(), this.baseFileName());

        fs.writeFileSync(packageFileLocation, json);

        return packageFileLocation;
    }

    async writeReadmeFile(packageFile: PackageFile): Promise<string> {
        const basePath = this.basePath();

        if (!fs.existsSync(basePath)) fs.mkdirSync(basePath, { recursive: true });

        const readmeFileName = packageFile.readmeFile ? packageFile.readmeFile : packageFile.packageSlug + ".README.md";
        const readmeFileLocation = path.join(basePath, readmeFileName);

        if (packageFile.readmeMarkdown) {
            fs.writeFileSync(readmeFileLocation, packageFile.readmeMarkdown);

            delete packageFile.readmeMarkdown;
            packageFile.readmeFile = readmeFileName;
        }

        return readmeFileLocation;
    }

    async writeLicenseFile(packageFile: PackageFile): Promise<string> {
        const basePath = this.basePath();

        if (!fs.existsSync(basePath)) fs.mkdirSync(basePath, { recursive: true });

        const licenseFile = packageFile.licenseFile ? packageFile.licenseFile : packageFile.packageSlug + ".LICENSE.md";
        const licenseFileLocation = path.join(basePath, licenseFile);

        if (packageFile.licenseMarkdown) {
            fs.writeFileSync(licenseFileLocation, packageFile.licenseMarkdown);

            delete packageFile.licenseMarkdown;
            packageFile.licenseFile = licenseFile;
        }

        return licenseFileLocation;
    }
}

function generatePackageFileLocation(basePath: string, baseFileName: string): string {
    return path.join(basePath, baseFileName + ".datapm.json");
}
