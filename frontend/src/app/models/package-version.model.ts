export interface PackageVersion {
    author?: {
        username: string;
    };
    identifier: {
        versionMajor: number;
        versionMinor: number;
        versionPatch: number;
    };
    updatedAt: Date;
}
