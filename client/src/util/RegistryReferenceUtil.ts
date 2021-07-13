import { PackageIdentifier } from "../generated/graphql";

export function packageString(packageIdentifier: PackageIdentifier): string {
    if (packageIdentifier.registryURL === "https://datapm.io") {
        return `${packageIdentifier.catalogSlug}/${packageIdentifier.packageSlug}`;
    }

    return `${packageIdentifier.registryURL}/${packageIdentifier.catalogSlug}/${packageIdentifier.packageSlug}`;
}
