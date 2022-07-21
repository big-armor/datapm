import { parsePackageFileJSON, catalogSlugValid, packageSlugValid, PackageFile, RegistryReference } from "datapm-lib";
import { Package, PackageIdentifierInput, Permission } from "../generated/graphql";
import { JobContext } from "../task/JobContext";
import { publishPackageFile } from "./PackageUtil";
import { getRegistryClientWithConfig } from "./RegistryClient";
import fetch from "cross-fetch";
import { parsePackageIdentifier } from "./ParsePackageIdentifierUtil";

export type CantSaveReasons = "NOT_AUTHENTICATED" | "SAVE_NOT_AVAILABLE" | "NOT_AUTHORIZED";

export function cantSaveReasonToString(reason: CantSaveReasons): string {
    switch (reason) {
        case "NOT_AUTHENTICATED":
            return "You are not logged in to the registry. Use the `datapm registry login` command to authenticate.";
        case "SAVE_NOT_AVAILABLE":
            return "Saving is not available for this package";
        case "NOT_AUTHORIZED":
            return "You do not have edit/write permission for the package.";
        default:
            return "Unknown reason";
    }
}

export interface PackageFileWithContext {
    packageFile: PackageFile;
    contextType: "temporary" | "localFile" | "registry" | "http";
    catalogSlug?: string;
    permitsSaving: boolean;
    hasPermissionToSave: boolean;
    cantSaveReason: CantSaveReasons | false;
    packageReference: string;
    readmeFileUrl: string | undefined;
    licenseFileUrl: string | undefined;

    save(packageFile: PackageFile): Promise<void>;
}
export class RegistryPackageFileContext implements PackageFileWithContext {
    // eslint-disable-next-line no-useless-constructor
    constructor(
        public jobContext: JobContext,
        public packageFile: PackageFile,
        public packageObject: Package,
        public isAuthenticated: boolean
    ) {}

    get contextType(): "registry" {
        return "registry";
    }

    get permitsSaving(): boolean {
        return true;
    }

    get hasPermissionToSave(): boolean {
        return this.packageObject.myPermissions?.includes(Permission.EDIT) || false;
    }

    get cantSaveReason(): CantSaveReasons | false {
        if (this.isAuthenticated !== true) {
            return "NOT_AUTHENTICATED";
        }

        if (!this.packageObject.myPermissions?.includes(Permission.EDIT)) {
            return "NOT_AUTHORIZED";
        }

        return false;
    }

    get packageReference(): string {
        return (
            this.packageObject.identifier.registryURL +
            "/" +
            this.packageObject.identifier.catalogSlug +
            "/" +
            this.packageObject.identifier.packageSlug
        );
    }

    get readmeFileUrl(): string | undefined {
        return (
            this.packageObject.identifier.registryURL +
            "/" +
            this.packageObject.identifier.catalogSlug +
            "/" +
            this.packageObject.identifier.packageSlug +
            "#readme"
        );
    }

    get licenseFileUrl(): string | undefined {
        return (
            this.packageObject.identifier.registryURL +
            "/" +
            this.packageObject.identifier.catalogSlug +
            "/" +
            this.packageObject.identifier.packageSlug +
            "#license"
        );
    }

    get registryUrl(): string {
        return this.packageObject.identifier.registryURL;
    }

    get catalogSlug(): string {
        return this.packageObject.identifier.catalogSlug;
    }

    async save(packageFile: PackageFile): Promise<void> {
        this.packageFile = packageFile;

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

        await publishPackageFile(this.jobContext, this, targetRegistries);
    }
}

export class HttpPackageFileContext implements PackageFileWithContext {
    // eslint-disable-next-line no-useless-constructor
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

    get packageReference(): string {
        return this.url;
    }

    get readmeFileUrl(): string | undefined {
        return undefined;
    }

    get licenseFileUrl(): string | undefined {
        return undefined;
    }

    get cantSaveReason(): CantSaveReasons | false {
        return "SAVE_NOT_AVAILABLE";
    }

    save(): Promise<void> {
        throw new Error("HttpPackageFileContext does not support saving");
    }
}

async function fetchPackage(
    jobContext: JobContext,
    registryUrl: string,
    identifier: PackageIdentifierInput,
    modifiedOrCanonical: "modified" | "canonicalIfAvailable"
): Promise<RegistryPackageFileContext> {
    const registryConfig = jobContext.getRegistryConfig(registryUrl);

    const registryClient = getRegistryClientWithConfig(jobContext, { url: registryUrl });

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

    const packageFile = parsePackageFileJSON(packageFileJSON);

    return new RegistryPackageFileContext(jobContext, packageFile, packageEntity, registryConfig?.apiKey != null);
}

export async function getPackageFromUrl(
    jobContext: JobContext,
    identifier: string | PackageIdentifierInput,
    modifiedOrCanonical: "modified" | "canonicalIfAvailable"
): Promise<HttpPackageFileContext | RegistryPackageFileContext> {
    if (typeof identifier === "string" && (identifier.startsWith("http://") || identifier.startsWith("https://"))) {
        const http = await fetch(identifier, {
            method: "GET"
        });

        if (http.headers.get("x-datapm-registry-url") != null) {
            const registryUrl = http.headers.get("x-datapm-registry-url") as string;

            const packageIdentifier = parsePackageIdentifier(identifier);

            try {
                return await fetchPackage(jobContext, registryUrl, packageIdentifier, modifiedOrCanonical);
            } catch (e) {
                if (typeof e.message === "string" && (e.message as string).includes("NOT_AUTHENTICATED")) {
                    throw new Error("NOT_AUTHENTICATED");
                } else {
                    throw e;
                }
            }
        }
        if (!http.ok) throw new Error(`Failed to obtain: HTTP code ${http.status} HTTP status ${http.statusText}`);

        if (
            !http.headers.get("content-type")?.includes("application/json") &&
            !http.headers.get("content-type")?.includes("text/plain")
        ) {
            throw new Error("NOT_A_PACKAGE_FILE");
        }

        const packageFile = parsePackageFileJSON(await http.text());
        return new HttpPackageFileContext(packageFile, identifier);
    } else if (typeof identifier === "string" && isValidPackageIdentifier(identifier) !== false) {
        const packageIdentifier: PackageIdentifierInput = {
            catalogSlug: identifier.split("/")[0],
            packageSlug: identifier.split("/")[1]
        };

        return fetchPackage(jobContext, "https://datapm.io", packageIdentifier, modifiedOrCanonical);
    } else {
        throw new Error(
            `Reference '${identifier}' is either not a valid package identifier, a valid package url, or url pointing to a valid package file.`
        );
    }
}

/** Whether a string is a valid identifier for a package on datapm.io */
function isValidPackageIdentifier(identifier: string): boolean {
    const parts = identifier.split("/");

    if (parts.length !== 2) return false;
    if (catalogSlugValid(parts[0]) !== true) return false;
    if (packageSlugValid(parts[1]) !== true) return false;

    return true;
}
