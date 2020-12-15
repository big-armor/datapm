export const mockPackages = [
    {
        identifier: {
            registryURL: "http://localhost:4200",
            catalogSlug: "dev-tony",
            packageSlug: "air-travel",
            __typename: "PackageIdentifier"
        },
        catalog: { myPermissions: ["MANAGE", "EDIT", "VIEW"], displayName: "dev-tony", __typename: "Catalog" },
        isPublic: false,
        displayName: "Air Travel",
        description: "Monthly transatlantic airtravel, in thousands of passengers, for 1958-1960.",
        latestVersion: {
            identifier: { versionMajor: 1, versionMinor: 0, versionPatch: 0, __typename: "VersionIdentifier" },
            createdAt: "2020-11-16T07:50:01.429Z",
            __typename: "Version"
        },
        creator: { username: "dev-tony", firstName: "Tony", lastName: "Lee", __typename: "User" },
        versions: [
            {
                identifier: { versionMajor: 1, versionMinor: 0, versionPatch: 0, __typename: "VersionIdentifier" },
                createdAt: "2020-11-16T07:50:01.429Z",
                __typename: "Version"
            }
        ],
        __typename: "Package"
    },
    {
        identifier: {
            registryURL: "http://localhost:4200",
            catalogSlug: "dev-tony",
            packageSlug: "home",
            __typename: "PackageIdentifier"
        },
        catalog: { myPermissions: ["MANAGE", "EDIT", "VIEW"], displayName: "dev-tony", __typename: "Catalog" },
        isPublic: false,
        displayName: "Home",
        description:
            "Home sale statistics. Fifty home sales, with selling price, asking price, living space, rooms, bedrooms, bathrooms, age, acreage, taxes. There is also an initial header line.",
        latestVersion: {
            identifier: { versionMajor: 1, versionMinor: 0, versionPatch: 0, __typename: "VersionIdentifier" },
            createdAt: "2020-11-16T07:51:53.811Z",
            __typename: "Version"
        },
        creator: { username: "dev-tony", firstName: "Tony", lastName: "Lee", __typename: "User" },
        versions: [
            {
                identifier: { versionMajor: 1, versionMinor: 0, versionPatch: 0, __typename: "VersionIdentifier" },
                createdAt: "2020-11-16T07:51:53.811Z",
                __typename: "Version"
            }
        ],
        __typename: "Package"
    }
];
