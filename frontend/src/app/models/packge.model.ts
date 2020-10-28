import { PackageVersion } from "./package-version.model";

export interface Package {
    description: string;
    displayName: string;
    identifier: {
        catalogSlug: string;
        packageSlug: string;
    };
    latestVersion?: PackageVersion;
    updatedAt: Date;
}
