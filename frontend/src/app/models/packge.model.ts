import { User } from "src/generated/graphql";
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
