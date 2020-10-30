import { PackageIdentifierInput } from "../../../src/generated/graphql";
import { getRegistryHostname, getRegistryURL } from "./RegistryAccessHelper";

export function packageToIdentifier(identifier: PackageIdentifierInput) {
    const hostname = getRegistryHostname();

    if (hostname == "datapm.io" || hostname == "www.datapm.io")
        return identifier.catalogSlug + "/" + identifier.packageSlug;

    return getRegistryURL() + "/" + identifier.catalogSlug + "/" + identifier.packageSlug;
}
