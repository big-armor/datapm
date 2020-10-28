import { User } from "./user.model";
import { PackageVersion } from "./package-version.model";

export interface Package {
    creator: User;
    description: string;
    displayName: string;
    identifier: {
        catalogSlug: string;
        packageSlug: string;
    };
    image?: string;
    latestVersion?: PackageVersion;
    updatedAt: Date;
}
