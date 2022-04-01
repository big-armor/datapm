import { PackageIdentifierInput } from "../main";

export function parsePackageIdentifier(url: string): PackageIdentifierInput {
    const pathParts = url.split("/");

    return {
        catalogSlug: pathParts[pathParts.length - 2],
        packageSlug: pathParts[pathParts.length - 1]
    };
}
