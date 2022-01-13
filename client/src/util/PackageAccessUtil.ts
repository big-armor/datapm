import fetch from "cross-fetch";
import {
    loadPackageFileFromDisk,
    parsePackageFileJSON,
    catalogSlugValid,
    packageSlugValid,
    PackageFile,
    validatePackageFile
} from "datapm-lib";
import fs from "fs";
import path from "path";
import url from "url";
import { Package, PackageIdentifier, PackageIdentifierInput } from "../generated/graphql";
import { getRegistryClientWithConfig, RegistryClient } from "./RegistryClient";

export interface PackageFileWithContext {
    package?: Package;
    packageFile: PackageFile;
    registryURL?: string;
    catalogSlug?: string;
    packageFileUrl: string;
}

async function fetchPackage(
    registryClient: RegistryClient,
    identifier: PackageIdentifierInput,
    modifiedOrCononical: "modified" | "cononical" | "cononicalIfAvailable"
): Promise<PackageFileWithContext> {
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

    if (modifiedOrCononical === "cononicalIfAvailable" && version.cononicalPackageFile != null) {
        packageFileJSON = version.cononicalPackageFile;
    } else if (modifiedOrCononical === "cononical") {
        packageFileJSON = version.cononicalPackageFile;
    }

    validatePackageFile(packageFileJSON);
    const packageFile = parsePackageFileJSON(packageFileJSON);
    return {
        package: response.data?.package,
        packageFile,
        registryURL: registryClient.registryConfig.url,
        catalogSlug: identifier.catalogSlug,
        packageFileUrl: `${registryClient.registryConfig.url}/${identifier.catalogSlug}/${identifier.packageSlug}`
    };
}

export async function getPackage(
    identifier: string,
    modifiedOrCononical: "modified" | "cononical" | "cononicalIfAvailable"
): Promise<PackageFileWithContext> {
    if (identifier.startsWith("http://") || identifier.startsWith("https://")) {
        const http = await fetch(identifier, {
            method: "GET"
        });

        if (http.headers.get("x-datapm-version") != null) {
            const parsedUrl = new url.URL(identifier);
            let serverUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}`;

            if (parsedUrl.port != null) serverUrl = `${serverUrl}:${parsedUrl.port}`;

            const registryClient = getRegistryClientWithConfig({ url: serverUrl });

            // TODO handle registries that are not hosted at the root path

            let path = parsedUrl.pathname;

            // const graphqlPath = http.headers.get("x-datapm-graphql-path");

            if (path?.startsWith("/")) {
                path = path.substr(1, path.length - 1);
            }
            const pathParts = path?.split("/") || [];

            // TODO support fetching specific package versions

            try {
                return await fetchPackage(
                    registryClient,
                    {
                        catalogSlug: pathParts[0],
                        packageSlug: pathParts[1]
                    },
                    modifiedOrCononical
                );
            } catch (e) {
                if (typeof e.message === "string" && (e.message as string).includes("NOT_AUTHENTICATED")) {
                    throw new Error("NOT_AUTHENTICATED_TO_REGISTRY");
                } else {
                    throw e;
                }
            }
        }
        if (!http.ok) throw new Error(`Failed to obtain ${http.status} ${http.statusText}`);

        return {
            packageFile: parsePackageFileJSON(await http.text()),
            packageFileUrl: identifier
        };
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

        return {
            packageFile,
            packageFileUrl: `file://${pathToPackageFile}${path.sep}${packageFileName}`
        };
    } else if (isValidPackageIdentifier(identifier) !== false) {
        const registryClient = getRegistryClientWithConfig({ url: "https://datapm.io" });
        const packageIdentifier = parsePackageIdentifier(identifier);

        return fetchPackage(registryClient, packageIdentifier, modifiedOrCononical);
    } else {
        throw new Error(
            `Reference '${identifier}' is either not a valid package identifier, a valid package url, or url pointing to a valid package file.`
        );
    }
}

// TODO Move these functions to datapm-lib
/** After validating, parse the identifier string into a PackageIdentifier for the datapm.io domain */
export function parsePackageIdentifier(identifier: string): PackageIdentifier {
    const parts = identifier.split("/");

    return {
        registryURL: "https://datapm.io",
        catalogSlug: parts[0],
        packageSlug: parts[1]
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
