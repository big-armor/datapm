import {
    PACKAGE_DESCRIPTION_MAX_LENGTH,
    PACKAGE_DESCRIPTION_MIN_LENGTH,
    validPackageDescription,
    validPackageDisplayName as validPackageDisplayName2
} from "datapm-lib";
import { CatalogIdentifier, PackageIdentifier, VersionIdentifier } from "../generated/graphql";

export function validVersion(value: string[] | string | number | boolean): true | string {
    if (typeof value !== "string") {
        return "Must be a string";
    }

    const regex = /^[0-9]+\.[0-9]+\.[0-9]+$/;

    const trimmedValue = value.trim();

    if (!regex.test(trimmedValue)) return "Must be in format of 1.2.3";

    return true;
}

export function validPackageDisplayName(value: string[] | string | number | boolean): true | string {
    if (value == null) return "Must not be null";

    if (typeof value === "number") return "Must be a string";

    if (typeof value === "boolean") return "Must be a string";

    if (Array.isArray(value)) {
        return "Must be a string";
    }

    const valid = validPackageDisplayName2(value);

    if (valid === "TOO_SHORT") return "Must be longer than " + PACKAGE_DESCRIPTION_MIN_LENGTH + " characters";

    if (value === "TOO_LONG") return "Must be less than " + PACKAGE_DESCRIPTION_MAX_LENGTH + " characters";

    if (valid === "INVALID_CHARACTERS")
        return "Must start with a letter, and contain only letters, numbers, spaces, and the following characters: -_%*+";

    return true;
}

export function validShortPackageDescription(value: string[] | string | number | boolean): true | string {
    if (value == null) return "Must not be null";

    if (typeof value !== "string") return "Must be a string";

    const valid = validPackageDescription(value);

    if (valid === "TOO_SHORT") return "Must be longer than " + PACKAGE_DESCRIPTION_MIN_LENGTH + " characters";

    if (value === "TOO_LONG") return "Must be less than " + PACKAGE_DESCRIPTION_MAX_LENGTH + " characters";

    return true;
}

export function validUnit(value: string[] | string | number | boolean): true | string {
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
    let registryUrl = identifier.registryURL;

    if (registryUrl) {
        if (identifier.registryURL?.match(/^https?:\/\/(www\.)?datapm.io/) != null) {
            registryUrl = "";
        } else if (!registryUrl.endsWith("/")) {
            registryUrl = `${registryUrl}/`;
        }
    }

    if (isCatalogIdentifier(identifier)) {
        return `${registryUrl}${identifier.catalogSlug}`;
    } else if (isPackageIdentifier(identifier)) {
        return `${registryUrl}${identifier.catalogSlug}/${identifier.packageSlug}`;
    } else if (isVersionIdentifier(identifier)) {
        return `${registryUrl}${identifier.catalogSlug}/${identifier.packageSlug}/${identifier.versionMajor}.${identifier.versionMinor}.${identifier.versionPatch}`;
    }

    throw new Error("Unknown identifier type");
}
