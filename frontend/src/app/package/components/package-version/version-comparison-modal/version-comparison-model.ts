import { PackageIdentifierInput, Version, VersionIdentifier } from "src/generated/graphql";

export interface VersionComparisonModel {
    packageIdentifier: PackageIdentifierInput;
    newVersion: VersionIdentifier;
    oldVersion: VersionIdentifier;
    versions: Version[];
}
