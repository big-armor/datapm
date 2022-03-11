import { CatalogIdentifier, PackageIdentifier, VersionIdentifier } from "../generated/graphql";

export function validVersion(value: string | number | boolean): true | string {
    if (typeof value !== "string") {
        return "Must be a string";
    }

    const regex = /^[0-9]+\.[0-9]+\.[0-9]+$/;

    const trimmedValue = value.trim();

    if (!regex.test(trimmedValue)) return "Must be in format of 1.2.3";

    return true;
}

export function validPackageDisplayName(value: string | number | boolean): true | string {
    if (value == null) return "Must not be null";

    if (typeof value === "number") return "Must be a string";

    if (typeof value === "boolean") return "Must be a string";

    if (value.length < 3) return "Must be longer than 3 characters";

    if (!value.match(/^[\w _-]+$/)) return "Must be a valid name";

    if (value.length > 128) return "Must be shorter than 128 characters";

    return true;
}

export function validShortPackageDescription(value: string | number | boolean): true | string {
    if (value == null) return "Must not be null";

    if (typeof value !== "string") return "Must be a string";

    if (value.length < 3) return "Must be longer than 3 characters";

    if (value.length > 256) return "Must be less than 256 characters";

    return true;
}

export function validUnit(value: string | number | boolean): true | string {
    if (typeof value !== "string") return "Must be a string";
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
