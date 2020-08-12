import { Catalog } from "../entity/Catalog";
import { Package } from "../entity/Package";
import { Version } from "../entity/Version";
import { CatalogIdentifier, PackageIdentifier, VersionIdentifier } from "../generated/graphql";
import { getEnvVariable } from "./getEnvVariable";

export class Identifier {
    registryHostname: String;
    registryPort:number;
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
    const returnValue = new Identifier();

    const hostPortParts = identifier[0].split(":")
    returnValue.registryHostname = hostPortParts[0];
    returnValue.registryPort = Number.parseInt(hostPortParts[1]);

    if(parts.length > 1)
        returnValue.catalogSlug = identifier[1];

    if(parts.length > 2)
        returnValue.packageSlug = identifier[2];

    if(parts.length > 3) {

        const versionParts = identifier[3].split(".");

        returnValue.version = {
            majorVersion: Number.parseInt(versionParts[0]),
            minorVersion: Number.parseInt(versionParts[1]),
            patchVersion: Number.parseInt(versionParts[2])
        }
        
    }

    if(parts.length > 4)
        returnValue.attributeSlug = identifier[4];  
        
    
    if(parts.length > 5)
        returnValue.enumerationSlug = identifier[5];
}


export function catalogIdentifier(catalog: Catalog): CatalogIdentifier {

    return {
        registryHostname: getEnvVariable("REGISTRY_NAME"),
        registryPort: Number.parseInt(getEnvVariable("REGISTRY_PORT")),
        catalogSlug: catalog.slug
    }

}


export function packageIdentifier(packageEntity: Package): PackageIdentifier {

    return {
        registryHostname: getEnvVariable("REGISTRY_NAME"),
        registryPort: Number.parseInt(getEnvVariable("REGISTRY_PORT")),
        catalogSlug: packageEntity.catalog.slug,
        packageSlug: packageEntity.slug
    }
}


export function versionIdentifier(version: Version): VersionIdentifier {
    return {
        registryHostname: getEnvVariable("REGISTRY_NAME"),
        registryPort: Number.parseInt(getEnvVariable("REGISTRY_PORT")),
        catalogSlug: version.package.catalog.slug,
        packageSlug: version.package.slug,
        versionMajor: version.majorVersion,
        versionMinor: version.minorVersion,
        versionPatch: version.patchVersion
    }

}

