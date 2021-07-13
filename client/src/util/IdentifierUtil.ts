import { CatalogIdentifier, PackageIdentifier, VersionIdentifier } from "../generated/graphql";

export function validVersion(value: string): boolean | string {
    const regex = /^[0-9]+\.[0-9]+\.[0-9]+$/;

    const trimmedValue = value.trim();

    if (!regex.test(trimmedValue)) return "Must be in format of 1.2.3";

    return true;
}

export function validPackageDisplayName(value: string): boolean | string {
    if (value == null) return false;

    if (value.length < 3) return "Must be longer than 3 characters";

    if (!value.match(/^[\w _-]+$/)) return "Must be a valid name";

    if (value.length > 128) return "Must be shorter than 128 characters";

    return true;
}

export function validShortPackageDescription(value: string): boolean | string {
    if (value == null) return false;

    if (value.length < 3) return "Must be longer than 3 characters";

    if (value.length > 256) return "Must be less than 256 characters";

    return true;
}

export function validUnit(value: string): boolean | string {
    if (value && value.length > 128) return "Must be less than 128 characters";

    return true;
}

export function isVersionIdentifier(
    identifier: PackageIdentifier | VersionIdentifier | CatalogIdentifier
): identifier is VersionIdentifier {
    return (identifier as VersionIdentifier).versionMajor !== undefined;
}

export function isPackageIdentifier(
    identifier: PackageIdentifier | VersionIdentifier | CatalogIdentifier
): identifier is PackageIdentifier {
    if (isVersionIdentifier(identifier)) return false;

    return (identifier as PackageIdentifier).packageSlug !== undefined;
}

export function isCatalogIdentifier(
    identifier: PackageIdentifier | VersionIdentifier | CatalogIdentifier
): identifier is CatalogIdentifier {
    if (isPackageIdentifier(identifier)) return false;

    return (identifier as CatalogIdentifier).catalogSlug !== undefined;
}

export function identifierToString(identifier: PackageIdentifier | VersionIdentifier | CatalogIdentifier): string {
    if (isCatalogIdentifier(identifier)) {
        return `${identifier.registryURL}/${identifier.catalogSlug}`;
    } else if (isPackageIdentifier(identifier)) {
        return `${identifier.registryURL}/${identifier.catalogSlug}/${identifier.packageSlug}`;
    } else if (isVersionIdentifier(identifier)) {
        return `${identifier.registryURL}/${identifier.catalogSlug}/${identifier.packageSlug}/${identifier.versionMajor}.${identifier.versionMinor}.${identifier.versionPatch}`;
    }

    throw new Error("Unknown identifier type");
}
