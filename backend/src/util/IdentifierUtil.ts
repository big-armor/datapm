import { Catalog } from "../entity/Catalog";
import { Package } from "../entity/Package";
import { Version } from "../entity/Version";
import { CatalogIdentifier, PackageIdentifier, VersionIdentifier } from "../generated/graphql";
import { getEnvVariable } from "./getEnvVariable";

export interface Identifier {
    catalogSlug: String;
    packageSlug: String;
    version: {
        majorVersion: number;
        minorVersion: number;
        patchVersion: number;
    };
    attributeSlug:String;
    enumerationSlug:String;

}

export function parseIdentifierString(identifier: String) {
    const parts = identifier.split("/");
    const returnValue = {} as Identifier;

    returnValue.catalogSlug = identifier[0];

    if(parts.length > 1)
        returnValue.packageSlug = identifier[1];

    if(parts.length > 2) {

        const versionParts = identifier[3].split(".");

        returnValue.version = {
            majorVersion: Number.parseInt(versionParts[0]),
            minorVersion: Number.parseInt(versionParts[1]),
            patchVersion: Number.parseInt(versionParts[2])
        }
        
    }

    throw new Error("Unknown identifier");
}


export function catalogIdentifier(catalog: Catalog): CatalogIdentifier {

    return {
        catalogSlug: catalog.slug
    }

}


export function packageIdentifier(packageEntity: Package): PackageIdentifier {

    return {
        catalogSlug: packageEntity.catalog.slug,
        packageSlug: packageEntity.slug
    }
}


export function versionIdentifier(version: Version): VersionIdentifier {
    return {
        catalogSlug: version.package.catalog.slug,
        packageSlug: version.package.slug,
        versionMajor: version.majorVersion,
        versionMinor: version.minorVersion,
        versionPatch: version.patchVersion
    }

}

