import { CatalogEntity } from "../entity/CatalogEntity";
import { PackageEntity } from "../entity/PackageEntity";
import { VersionEntity } from "../entity/VersionEntity";
import { CatalogIdentifier, PackageIdentifier, VersionIdentifier } from "../generated/graphql";
import { getEnvVariable } from "./getEnvVariable";

export interface Identifier {
    catalogSlug: string;
    packageSlug: string;
    version: {
        majorVersion: number;
        minorVersion: number;
        patchVersion: number;
    };
    attributeSlug: string;
    enumerationSlug: string;
}

export function parseIdentifierString(identifier: string): void {
    const parts = identifier.split("/");
    const returnValue = {} as Identifier;

    returnValue.catalogSlug = identifier[0];

    if (parts.length > 1) returnValue.packageSlug = identifier[1];

    if (parts.length > 2) {
        const versionParts = identifier[3].split(".");

        returnValue.version = {
            majorVersion: Number.parseInt(versionParts[0]),
            minorVersion: Number.parseInt(versionParts[1]),
            patchVersion: Number.parseInt(versionParts[2])
        };
    }

    throw new Error("Unknown identifier");
}

export function catalogIdentifier(catalog: CatalogEntity): CatalogIdentifier {
    return {
        registryURL: getEnvVariable("REGISTRY_URL"),
        catalogSlug: catalog.slug
    };
}

export function packageIdentifier(packageEntity: PackageEntity): PackageIdentifier {
    return {
        registryURL: getEnvVariable("REGISTRY_URL"),
        catalogSlug: packageEntity.catalog.slug,
        packageSlug: packageEntity.slug
    };
}

export function versionIdentifier(version: VersionEntity): VersionIdentifier {
    return {
        registryURL: getEnvVariable("REGISTRY_URL"),
        catalogSlug: version.package.catalog.slug,
        packageSlug: version.package.slug,
        versionMajor: version.majorVersion,
        versionMinor: version.minorVersion,
        versionPatch: version.patchVersion
    };
}
