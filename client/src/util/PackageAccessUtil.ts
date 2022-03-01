import fetch from "cross-fetch";
import {
    loadPackageFileFromDisk,
    parsePackageFileJSON,
    catalogSlugValid,
    packageSlugValid,
    PackageFile,
    validatePackageFile,
    RegistryReference
} from "datapm-lib";
import fs from "fs";
import path from "path";
import { Package, PackageIdentifierInput, Permission } from "../generated/graphql";
import { JobContext } from "../task/Task";
import { publishPackageFile, writeLicenseFile, writePackageFile, writeReadmeFile } from "./PackageUtil";
import { getRegistryClientWithConfig } from "./RegistryClient";

export interface PackageFileWithContext {
    packageFile: PackageFile;
    contextType: "localFile" | "registry" | "http";
    catalogSlug?: string;
    permitsSaving: boolean;
    hasPermissionToSave: boolean;
    packageFileUrl: string;

    save(jobContext: JobContext, packageFile: PackageFile): Promise<void>;
}
export class RegistryPackageFileContext implements PackageFileWithContext {
    constructor(public packageFile: PackageFile, public packageObject: Package) {}

    get contextType(): "registry" {
        return "registry";
    }

    get permitsSaving(): boolean {
        return true;
    }

    get hasPermissionToSave(): boolean {
        return this.packageObject.myPermissions?.includes(Permission.EDIT) || false;
    }

    get packageFileUrl(): string {
        return (
            this.packageObject.identifier.registryURL +
            "/" +
            this.packageObject.identifier.catalogSlug +
            "/" +
            this.packageObject.identifier.packageSlug
        );
    }

    get registryUrl(): string {
        return this.packageObject.identifier.registryURL;
    }

    get catalogSlug(): string {
        return this.packageObject.identifier.catalogSlug;
    }

    async save(jobContext: JobContext, packageFile: PackageFile): Promise<void> {
        const publishMethod = packageFile.registries?.find(
            (r) =>
                r.url.toLowerCase() === this.registryUrl.toLowerCase() &&
                r.catalogSlug === this.packageObject.identifier.catalogSlug
        )?.publishMethod;

        if (publishMethod == null) {
            // need to obtain a publish method
            throw new Error("Target registry not found in Package File. Could not determine the publish method");
        }

        const targetRegistries: RegistryReference[] = [
            {
                catalogSlug: this.catalogSlug,
                publishMethod,
                url: this.registryUrl
            }
        ];

        await publishPackageFile(jobContext, packageFile, targetRegistries);
    }
}

export class LocalPackageFileContext implements PackageFileWithContext {
    constructor(public packageFile: PackageFile, public packageFilePath: string) {}

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

    get packageFileUrl(): string {
        return this.packageFilePath;
    }

    async save(jobContext: JobContext, packageFile: PackageFile): Promise<void> {
        // Write updates to the target package file in place
        let task = await jobContext.startTask("Writing package file...");
        let packageFileLocation;

        try {
            packageFileLocation = await writePackageFile(jobContext, undefined, packageFile);

            await task.end("SUCCESS", `Wrote package file ${packageFileLocation}`);
        } catch (error) {
            await task.end("ERROR", `Unable to write the package file: ${error.message}`);
            throw error;
        }

        task = await jobContext.startTask("Writing README file...");
        try {
            const readmeFileLocation = writeReadmeFile(jobContext, undefined, packageFile);
            await task.end("SUCCESS", `Wrote README file ${readmeFileLocation}`);
        } catch (error) {
            await task.end("ERROR", `Unable to write the README file: ${error.message}`);
            throw error;
        }

        task = await jobContext.startTask("Writing LICENSE file...");
        try {
            const licenseFileLocation = writeLicenseFile(jobContext, undefined, packageFile);
            await task.end("SUCCESS", `Wrote LICENSE file ${licenseFileLocation}`);
        } catch (error) {
            await task.end("ERROR", `Unable to write the LICENSE file: ${error.message}`);
            throw error;
        }
    }
}

export class HttpPackageFileContext implements PackageFileWithContext {
    constructor(public packageFile: PackageFile, public url: string) {}

    get contextType(): "http" {
        return "http";
    }

    get permitsSaving(): boolean {
        return true;
    }

    get hasPermissionToSave(): boolean {
        throw new Error("HttpPackageFileContext does not support saving");
    }

    get packageFileUrl(): string {
        return this.url;
    }

    save(): Promise<void> {
        throw new Error("HttpPackageFileContext does not support saving");
    }
}

async function fetchPackage(
    registryUrl: string,
    identifier: PackageIdentifierInput,
    modifiedOrCanonical: "modified" | "canonicalIfAvailable"
): Promise<RegistryPackageFileContext> {
    const registryClient = getRegistryClientWithConfig({ url: registryUrl });

    const response = await registryClient.getPackage({
        packageSlug: identifier.packageSlug,
        catalogSlug: identifier.catalogSlug
    });

    if (response.errors) {
        throw new Error(response.errors[0].message); // TODO how to convert multiple errors?
    }

    const packageEntity = response.data.package;
    const version = packageEntity.latestVersion;

    if (version == null) {
        throw new Error("Found package, but it has no latest version");
    }

    let packageFileJSON = version.packageFile;

    if (modifiedOrCanonical === "canonicalIfAvailable" && version.canonicalPackageFile != null) {
        packageFileJSON = version.canonicalPackageFile;
    }

    validatePackageFile(packageFileJSON);
    const packageFile = parsePackageFileJSON(packageFileJSON);

    return new RegistryPackageFileContext(packageFile, packageEntity);
}

export async function getPackage(
    identifier: string,
    modifiedOrCanonical: "modified" | "canonicalIfAvailable"
): Promise<PackageFileWithContext> {
    if (identifier.startsWith("http://") || identifier.startsWith("https://")) {
        const http = await fetch(identifier, {
            method: "GET"
        });

        if (http.headers.get("x-datapm-registry-url") != null) {
            const registryUrl = http.headers.get("x-datapm-registry-url") as string;

            const packageIdentifier = parsePackageIdentifier(identifier);

            try {
                return await fetchPackage(registryUrl, packageIdentifier, modifiedOrCanonical);
            } catch (e) {
                if (typeof e.message === "string" && (e.message as string).includes("NOT_AUTHENTICATED")) {
                    throw new Error("NOT_AUTHENTICATED_TO_REGISTRY");
                } else {
                    throw e;
                }
            }
        }
        if (!http.ok) throw new Error(`Failed to obtain: HTTP code ${http.status} HTTP status ${http.statusText}`);

        const packageFile = parsePackageFileJSON(await http.text());
        return new HttpPackageFileContext(packageFile, identifier);
    } else if (fs.existsSync(identifier)) {
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

        return new LocalPackageFileContext(packageFile, filePAth);
    } else if (isValidPackageIdentifier(identifier) !== false) {
        const packageIdentifier: PackageIdentifierInput = {
            catalogSlug: identifier.split("/")[0],
            packageSlug: identifier.split("/")[1]
        };

        return fetchPackage("https://datapm.io", packageIdentifier, modifiedOrCanonical);
    } else {
        throw new Error(
            `Reference '${identifier}' is either not a valid package identifier, a valid package url, or url pointing to a valid package file.`
        );
    }
}

function parsePackageIdentifier(url: string): PackageIdentifierInput {
    const pathParts = url.split("/");

    return {
        catalogSlug: pathParts[pathParts.length - 2],
        packageSlug: pathParts[pathParts.length - 1]
    };
}

/** Whether a string is a valid identifier for a package on datapm.io */
function isValidPackageIdentifier(identifier: string): boolean {
    const parts = identifier.split("/");

    if (parts.length !== 2) return false;
    if (catalogSlugValid(parts[0]) !== true) return false;
    if (packageSlugValid(parts[1]) !== true) return false;

    return true;
}
