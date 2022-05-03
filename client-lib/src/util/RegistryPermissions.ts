import { PackageIdentifierInput, Permission } from "../generated/graphql";
import { JobContext } from "../task/JobContext";
import { RegistryClient } from "./RegistryClient";

/** Throws a "NOT_AUTHENTICATED or "NOT_AUTHORIZED" error if the user does not have permission. */
export async function checkPackagePermissionsOnRegistry(
    jobContext: JobContext,
    packageIdentifier: PackageIdentifierInput,
    registryUrl: string,
    permission: Permission
): Promise<void> {
    // Check if the API key was configured for the package registry URL
    const registryConfig = jobContext.getRegistryConfig(registryUrl);
    if (!registryConfig?.apiKey) {
        throw new Error("NOT_AUTHENTICATED");
    }

    // Check if the user has EDIT permission before continuing
    const registryClient = new RegistryClient(registryConfig);
    const result = await registryClient.getPackage(packageIdentifier);

    if (result.errors != null) {
        throw new Error(result.errors[0].message);
    }

    if (result.data.package.myPermissions?.find((p) => p === permission) == null) {
        throw new Error("NOT_AUTHORIZED");
    }
}
