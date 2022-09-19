import { ApolloClient, NormalizedCacheObject, ServerError } from "@apollo/client/core";
import { ErrorResponse } from "apollo-link-error";
import { expect } from "chai";
import {
    CreatePackageDocument,
    PackageDocument,
    UpdateCatalogDocument,
    UpdatePackageDocument,
    CreateVersionDocument,
    DeletePackageDocument,
    MyPackagesDocument,
    GetLatestPackagesDocument,
    UserPackagesDocument,
    Permission,
    SetPackagePermissionsDocument,
    RemovePackagePermissionsDocument,
    UsersByPackageDocument,
    PackageVersionsDiffDocument,
    CreateCatalogDocument,
    PackageVersionsDiffsDocument
} from "./registry-client";
import { createAnonymousClient, createUser } from "./test-utils";
import * as crypto from "crypto";
import { parsePackageFileJSON, loadPackageFileFromDisk } from "datapm-lib";
import { describe, it } from "mocha";
import { AdminHolder } from "./admin-holder";

describe("Package Tests", async () => {
    let userAClient: ApolloClient<NormalizedCacheObject>;
    let userBClient: ApolloClient<NormalizedCacheObject>;
    const anonymousClient = createAnonymousClient();

    it("Create users A & B", async function () {
        userAClient = await createUser(
            "FirstA",
            "LastA",
            "testA-packages",
            "testA-packages@test.datapm.io",
            "passwordA!"
        );
        userBClient = await createUser(
            "FirstB",
            "LastB",
            "testB-packages",
            "testB-packages@test.datapm.io",
            "passwordB!"
        );
        expect(userAClient).to.not.equal(undefined);
        expect(userBClient).to.not.equal(undefined);
    });

    it("Should have catalog not found error", async function () {
        const response = await userBClient.query({
            query: PackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "invalid-catalog-name",
                    packageSlug: "congressional-legislators"
                }
            }
        });

        expect(response.errors != null, "should have errors").to.equal(true);
        expect(
            response.errors?.find((e) => e.message.startsWith("CATALOG_NOT_FOUND")) != null,
            "should have catalog not found error"
        ).equal(true);
    });

    it("Should allow user to see own packages", async function () {
        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: "testA-packages",
                    packageSlug: "food-a",
                    displayName: "Congressional LegislatorsA",
                    description: "Test upload of congressional legislatorsA"
                }
            }
        });

        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: "testA-packages",
                    packageSlug: "food-a2",
                    displayName: "Congressional LegislatorsA2",
                    description: "Test upload of congressional legislatorsA2"
                }
            }
        });

        await userBClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: "testB-packages",
                    packageSlug: "food-b",
                    displayName: "Congressional LegislatorsB",
                    description: "Test upload of congressional legislatorsB"
                }
            }
        });

        const findMyPackagesA = await userAClient.query({
            query: MyPackagesDocument,
            variables: {
                offset: 0,
                limit: 5
            }
        });

        const findMyPackagesB = await userBClient.query({
            query: MyPackagesDocument,
            variables: {
                offset: 0,
                limit: 5
            }
        });

        expect(findMyPackagesA.data.myPackages.count).to.equal(2);
        expect(findMyPackagesB.data.myPackages.count).to.equal(1);
    });

    it("Should allow user to create a package", async function () {
        const response = await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: "testA-packages",
                    packageSlug: "congressional-legislators",
                    displayName: "Congressional Legislators",
                    description: "Test upload of congressional legislators"
                }
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
        expect(response.data?.createPackage.catalog?.displayName).to.equal("testA-packages");
        expect(response.data?.createPackage.description).to.equal("Test upload of congressional legislators");
        expect(response.data?.createPackage.displayName).to.equal("Congressional Legislators");
        expect(response.data?.createPackage.identifier.catalogSlug).to.equal("testA-packages");
        expect(response.data?.createPackage.identifier.packageSlug).to.equal("congressional-legislators");
        expect(response.data?.createPackage.latestVersion).to.equal(null);
    });

    it("package should not be available anonymously", async function () {
        const response = await anonymousClient.query({
            query: PackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "congressional-legislators"
                }
            }
        });

        expect(response.errors != null, "should have errors").to.equal(true);
        expect(
            response.errors?.find((e) => e.message === "NOT_AUTHENTICATED") != null,
            "should have not authenticated error"
        ).equal(true);
    });

    it("package should not be available to user B", async function () {
        const response = await userBClient.query({
            query: PackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "congressional-legislators"
                }
            }
        });

        expect(response.errors != null, "should have errors").to.equal(true);
        expect(
            response.errors?.find((e) => e.message === "NOT_AUTHORIZED") != null,
            "should have not authorization error"
        ).equal(true);
    });

    it("User A package list should not available to user B", async function () {
        const response = await userBClient.query({
            query: UserPackagesDocument,
            variables: {
                username: "testA-packages",
                offSet: 0,
                limit: 100
            }
        });

        expect(response.errors == null, "should not have errors").to.equal(true);
        expect(response.data.userPackages.hasMore).to.equal(false);
        expect(response.data.userPackages.count).to.equal(0);
        expect(response.data.userPackages.packages?.length).to.equal(0);
    });

    it("User A can get package", async function () {
        const response = await userAClient.query({
            query: PackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "congressional-legislators"
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);
        expect(response.data?.package?.catalog?.displayName).to.equal("testA-packages");
        expect(response.data?.package?.description).to.equal("Test upload of congressional legislators");
        expect(response.data?.package?.displayName).to.equal("Congressional Legislators");
        expect(response.data?.package?.identifier.catalogSlug).to.equal("testA-packages");
        expect(response.data?.package?.identifier.packageSlug).to.equal("congressional-legislators");
        expect(response.data?.package?.latestVersion).to.equal(null);
        expect(response.data?.package?.versions?.length).equal(0);
    });

    it("User A update catalog to be public", async function () {
        const response = await userAClient.mutate({
            mutation: UpdateCatalogDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages"
                },
                value: {
                    isPublic: true
                }
            }
        });

        expect(response.errors == null).equal(true);
    });

    it("User A package list should not available to user B", async function () {
        const response = await userBClient.query({
            query: UserPackagesDocument,
            variables: {
                username: "testA-packages",
                offSet: 0,
                limit: 100
            }
        });

        expect(response.errors == null, "should not have errors").to.equal(true);
        expect(response.data.userPackages.hasMore).to.equal(false);
        expect(response.data.userPackages.count).to.equal(0);
        expect(response.data.userPackages.packages?.length).to.equal(0);
    });

    it("package should not be available anonymously - package is private", async function () {
        const response = await anonymousClient.query({
            query: PackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "congressional-legislators"
                }
            }
        });

        expect(response.errors != null, "should have errors").to.equal(true);
        expect(
            response.errors?.find((e) => e.message === "NOT_AUTHENTICATED") != null,
            "should have not authenticated error"
        ).equal(true);
    });

    it("Should not be in latest list - because it is not public", async function () {
        const response = await anonymousClient.query({
            query: GetLatestPackagesDocument,
            variables: {
                limit: 10,
                offset: 0
            }
        });

        expect(response.errors == null, "no errors").equal(true);
        expect(
            response.data?.latestPackages.packages?.find((p) => p.identifier.packageSlug === "new-package-slug")
        ).to.equal(undefined);
    });

    it("User A can not set package public - no versions", async function () {
        const response = await userAClient.mutate({
            mutation: UpdatePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "congressional-legislators"
                },
                value: {
                    isPublic: true
                }
            }
        });
        expect(response.errors != null, "has errors").equal(true);
        expect(response.errors?.find((e) => e.message.includes("PACKAGE_HAS_NO_VERSIONS"))).to.not.equal(undefined);
    });

    it("User A publish first version", async function () {
        const packageFileContents = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");

        const packageFileString = JSON.stringify(packageFileContents);

        const response = await userAClient.mutate({
            mutation: CreateVersionDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "congressional-legislators"
                },
                value: {
                    packageFile: packageFileString
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);
        expect(response.data?.createVersion.author?.username).equal("testA-packages");

        const responsePackageFileContents = response.data?.createVersion.packageFile;

        const responsePackageFile = parsePackageFileJSON(responsePackageFileContents);

        expect(responsePackageFile.readmeMarkdown).includes("This is where a readme might go");
        expect(responsePackageFile.licenseMarkdown).includes("This is not a real license. Just a test.");
    });

    it("User A can update package", async function () {
        const response = await userAClient.mutate({
            mutation: UpdatePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "congressional-legislators"
                },
                value: {
                    description: "New description",
                    displayName: "New displayName",
                    isPublic: true,
                    newPackageSlug: "new-package-slug"
                }
            }
        });
        expect(response.errors == null, "no errors").equal(true);
        expect(response.data?.updatePackage.catalog?.displayName).to.equal("testA-packages");
        expect(response.data?.updatePackage.description).to.equal("New description");
        expect(response.data?.updatePackage.displayName).to.equal("New displayName");
        expect(response.data?.updatePackage.identifier.catalogSlug).to.equal("testA-packages");
        expect(response.data?.updatePackage.identifier.packageSlug).to.equal("new-package-slug");
        expect(response.data?.updatePackage.latestVersion).to.not.equal(null);

        const identifier = response.data?.updatePackage.latestVersion?.identifier;

        expect(identifier?.versionMajor).to.equal(1);
        expect(identifier?.versionMinor).to.equal(0);
        expect(identifier?.versionPatch).to.equal(0);
    });

    it("Anonymous user can access package", async function () {
        const response = await anonymousClient.query({
            query: PackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "new-package-slug"
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);
        expect(response.data?.package.catalog?.displayName).to.equal("testA-packages");
        expect(response.data?.package.description).to.equal("New description");
        expect(response.data?.package.displayName).to.equal("New displayName");
        expect(response.data?.package.identifier.catalogSlug).to.equal("testA-packages");
        expect(response.data?.package.identifier.packageSlug).to.equal("new-package-slug");
        expect(response.data?.package.latestVersion).to.not.equal(null);
        expect(response.data?.package.versions?.length).equal(1);

        const identifier = response.data?.package.latestVersion?.identifier;

        expect(identifier?.versionMajor).to.equal(1);
        expect(identifier?.versionMinor).to.equal(0);
        expect(identifier?.versionPatch).to.equal(0);
    });

    it("user B can access package", async function () {
        const response = await userBClient.query({
            query: PackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "new-package-slug"
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);
        expect(response.data?.package.catalog?.displayName).to.equal("testA-packages");
        expect(response.data?.package.description).to.equal("New description");
        expect(response.data?.package.displayName).to.equal("New displayName");
        expect(response.data?.package.identifier.catalogSlug).to.equal("testA-packages");
        expect(response.data?.package.identifier.packageSlug).to.equal("new-package-slug");
        const identifier = response.data?.package.latestVersion?.identifier;

        expect(identifier?.versionMajor).to.equal(1);
        expect(identifier?.versionMinor).to.equal(0);
        expect(identifier?.versionPatch).to.equal(0);
    });

    it("User A package list should be available to user B", async function () {
        const response = await userBClient.query({
            query: UserPackagesDocument,
            variables: {
                username: "testA-packages",
                offSet: 0,
                limit: 100
            }
        });

        expect(response.errors == null, "should not have errors").to.equal(true);
        expect(response.data.userPackages.hasMore).to.equal(false);
        expect(response.data.userPackages.count).to.equal(1);
        expect(response.data.userPackages.packages?.length).to.equal(1);
    });

    it("User b can not update package", async function () {
        const response = await userBClient.mutate({
            mutation: UpdatePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "new-package-slug"
                },
                value: {
                    description: "New description should not be accepted",
                    displayName: "New displayName should not be accepted",
                    isPublic: true,
                    newPackageSlug: "new-package-slug-not-accepted"
                }
            }
        });

        expect(response.errors != null, "should have errors").to.equal(true);
        expect(
            response.errors?.find((e) => e.message === "NOT_AUTHORIZED") != null,
            "should have authorization error"
        ).equal(true);
    });

    it("Anonymous can not update package", async function () {
        const response = await anonymousClient.mutate({
            mutation: UpdatePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "new-package-slug"
                },
                value: {
                    description: "New description should not be accepted",
                    displayName: "New displayName should not be accepted",
                    isPublic: true,
                    newPackageSlug: "new-package-slug-not-accepted"
                }
            }
        });

        expect(response.errors != null, "should have errors").to.equal(true);
        expect(
            response.errors?.find((e) => e.message === "NOT_AUTHENTICATED") != null,
            "should have authentication error"
        ).equal(true);
    });

    it("Should be in latest list - anonymous user", async function () {
        const response = await anonymousClient.query({
            query: GetLatestPackagesDocument,
            variables: {
                limit: 10,
                offset: 0
            }
        });

        expect(response.errors == null, "no errors").equal(true);
        expect(
            response.data?.latestPackages.packages?.find((p) => p.identifier.packageSlug === "new-package-slug")
        ).to.not.equal(undefined);
    });

    it("User A packages list should be available to anonymous user", async function () {
        const response = await anonymousClient.query({
            query: UserPackagesDocument,
            variables: {
                username: "testA-packages",
                offSet: 0,
                limit: 100
            }
        });

        expect(response.errors == null, "should not have errors").to.equal(true);
        expect(response.data.userPackages.hasMore).to.equal(false);
        expect(response.data.userPackages.count).to.equal(1);
        expect(response.data.userPackages.packages?.length).to.equal(1);
    });

    it("Should be in latest list - creator", async function () {
        const response = await userAClient.query({
            query: GetLatestPackagesDocument,
            variables: {
                limit: 10,
                offset: 0
            }
        });

        expect(response.errors == null, "no errors").equal(true);
        expect(
            response.data?.latestPackages.packages?.find((p) => p.identifier.packageSlug === "new-package-slug")
        ).to.not.equal(undefined);
    });

    it("Anonymous get package file", async function () {
        const response = await anonymousClient.query({
            query: PackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "new-package-slug"
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);
        expect(response.data?.package.catalog?.displayName).to.equal("testA-packages");
        expect(response.data?.package.description).to.equal("New description");
        expect(response.data?.package.displayName).to.equal("New displayName");
        expect(response.data?.package.identifier.catalogSlug).to.equal("testA-packages");
        expect(response.data?.package.identifier.packageSlug).to.equal("new-package-slug");

        expect(response.data?.package.latestVersion?.identifier.versionMajor).equal(1);
        expect(response.data?.package.latestVersion?.identifier.versionMinor).equal(0);
        expect(response.data?.package.latestVersion?.identifier.versionPatch).equal(0);
    });

    it("User A publish second version - allow update without version change", async function () {
        const packageFileContents = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");

        const packageFileString = JSON.stringify(packageFileContents);

        const response = await userAClient.mutate({
            mutation: CreateVersionDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "new-package-slug"
                },
                value: {
                    packageFile: packageFileString
                }
            }
        });

        expect(response.errors == null, "should not have errors").to.equal(true);
        expect(response.data?.createVersion.identifier.versionMajor).equal(1);
        expect(response.data?.createVersion.identifier.versionMinor).equal(0);
        expect(response.data?.createVersion.identifier.versionPatch).equal(0);
    });

    it("User A publish malformed package JSON", async function () {
        const packageFileContents = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");

        let packageFileString = JSON.stringify(packageFileContents);
        packageFileString += "}";

        let errorFound = false;

        const response = await userAClient
            .mutate({
                mutation: CreateVersionDocument,
                variables: {
                    identifier: {
                        catalogSlug: "testA-packages",
                        packageSlug: "new-package-slug"
                    },
                    value: {
                        packageFile: packageFileString
                    }
                }
            })
            .catch((error: ErrorResponse) => {
                const fetchResult = error.networkError as ServerError;

                if (
                    fetchResult.result.errors.find((e: { extensions: { exception: { stacktrace: string[] } } }) => {
                        return (
                            e.extensions.exception.stacktrace.find((s) => s.includes("ERROR_PARSING_PACKAGE_FILE")) !=
                            null
                        );
                    }) != null
                )
                    errorFound = true;
            })
            .then((client) => {
                expect(errorFound, "invalid json format error not found").equal(true);
            });
    });

    it("User A publish invalid schema - packageSlug", async function () {
        const packageFileContents = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");
        packageFileContents.packageSlug += "-";

        const packageFileString = JSON.stringify(packageFileContents);

        let errorFound = false;

        const response = await userAClient
            .mutate({
                mutation: CreateVersionDocument,
                variables: {
                    identifier: {
                        catalogSlug: "testA-packages",
                        packageSlug: "new-package-slug"
                    },
                    value: {
                        packageFile: packageFileString
                    }
                }
            })
            .catch((error: ErrorResponse) => {
                const fetchResult = error.networkError as ServerError;
                if (
                    fetchResult.result.errors.find((e: { extensions: { exception: { stacktrace: string[] } } }) => {
                        return (
                            e.extensions.exception.stacktrace.find((s) => s.includes("INVALID_PACKAGE_FILE_SCHEMA")) !=
                            null
                        );
                    }) != null
                )
                    errorFound = true;
            })
            .then((response) => {
                expect(errorFound, "invalid schema error not found").equal(true);
            });
    });

    it("User A update package schema - patch - fail on version", async function () {
        const packageFileContents = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");
        packageFileContents.description = "new description";

        const packageFileString = JSON.stringify(packageFileContents);

        const response = await userAClient.mutate({
            mutation: CreateVersionDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "new-package-slug"
                },
                value: {
                    packageFile: packageFileString
                }
            }
        });

        expect(response.errors != null, "should  have errors").to.equal(true);
        expect(
            response.errors?.find((e) => e.extensions?.code === "HIGHER_VERSION_REQUIRED") != null,
            "should have higher version required"
        ).equal(true);
    });

    it("User A update package schema - patch", async function () {
        const packageFileContents = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");
        packageFileContents.description = "new description";
        packageFileContents.version = "1.0.1";
        const packageFileString = JSON.stringify(packageFileContents);

        const response = await userAClient.mutate({
            mutation: CreateVersionDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "new-package-slug"
                },
                value: {
                    packageFile: packageFileString
                }
            }
        });

        expect(response.errors == null, "should not have errors").to.equal(true);
        expect(response.data?.createVersion.identifier.catalogSlug).to.equal("testA-packages");
        expect(response.data?.createVersion.identifier.packageSlug).to.equal("new-package-slug");

        expect(response.data?.createVersion.identifier.versionMajor).equal(1);
        expect(response.data?.createVersion.identifier.versionMinor).equal(0);
        expect(response.data?.createVersion.identifier.versionPatch).equal(1);
    });

    it("User A update package schema - minor - fail on version number", async function () {
        const packageFileContents = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");
        packageFileContents.version = "1.0.2";
        packageFileContents.schemas[0].properties.new_column = {
            title: "new_column",
            types: {
                string: {
                    recordCount: 3238,
                    stringMaxLength: 17,
                    stringMinLength: 3
                }
            }
        };
        const packageFileString = JSON.stringify(packageFileContents);

        const response = await userAClient.mutate({
            mutation: CreateVersionDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "new-package-slug"
                },
                value: {
                    packageFile: packageFileString
                }
            }
        });

        expect(response.errors != null, "should  have errors").to.equal(true);
        expect(
            response.errors?.find((e) => e.extensions?.code === "HIGHER_VERSION_REQUIRED") != null,
            "should have higher version required"
        ).equal(true);
    });

    it("User A update package schema - minor", async function () {
        const packageFileContents = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");
        packageFileContents.version = "1.2.0";
        packageFileContents.schemas[0].properties.new_column = {
            title: "new_column",
            types: {
                string: {
                    recordCount: 3238,
                    stringMaxLength: 17,
                    stringMinLength: 3
                }
            }
        };
        const packageFileString = JSON.stringify(packageFileContents);

        const response = await userAClient.mutate({
            mutation: CreateVersionDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "new-package-slug"
                },
                value: {
                    packageFile: packageFileString
                }
            }
        });

        expect(response.errors == null, "should not have errors").to.equal(true);
        expect(response.data?.createVersion.identifier.catalogSlug).to.equal("testA-packages");
        expect(response.data?.createVersion.identifier.packageSlug).to.equal("new-package-slug");

        expect(response.data?.createVersion.identifier.versionMajor).equal(1);
        expect(response.data?.createVersion.identifier.versionMinor).equal(2);
        expect(response.data?.createVersion.identifier.versionPatch).equal(0);
    });

    it("User A update package schema - major - fail high version required", async function () {
        const packageFileContents = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");
        packageFileContents.version = "1.3.0";

        const packageFile = JSON.stringify(packageFileContents);

        const response = await userAClient.mutate({
            mutation: CreateVersionDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "new-package-slug"
                },
                value: {
                    packageFile: packageFile
                }
            }
        });

        expect(response.errors != null, "should  have errors").to.equal(true);
        expect(
            response.errors?.find((e) => e.extensions?.code === "HIGHER_VERSION_REQUIRED") != null,
            "should have higher version required"
        ).equal(true);
    });

    it("User A update package schema - major", async function () {
        const packageFileContents = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");
        packageFileContents.version = "2.0.0";

        const packageFile = JSON.stringify(packageFileContents);

        const response = await userAClient.mutate({
            mutation: CreateVersionDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "new-package-slug"
                },
                value: {
                    packageFile: packageFile
                }
            }
        });

        expect(response.errors == null, "should not have errors").to.equal(true);
        expect(response.data?.createVersion.identifier.catalogSlug).to.equal("testA-packages");
        expect(response.data?.createVersion.identifier.packageSlug).to.equal("new-package-slug");

        expect(response.data?.createVersion.identifier.versionMajor).equal(2);
        expect(response.data?.createVersion.identifier.versionMinor).equal(0);
        expect(response.data?.createVersion.identifier.versionPatch).equal(0);
    });

    it("User A find myPermissions on package", async function () {
        const response = await userAClient.query({
            query: PackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "new-package-slug"
                }
            }
        });

        expect(response.errors == null).equal(true);

        expect(response.data.package.myPermissions?.indexOf(Permission.MANAGE) !== -1).equal(true);
        expect(response.data.package.myPermissions?.indexOf(Permission.VIEW) !== -1).equal(true);
        expect(response.data.package.myPermissions?.indexOf(Permission.EDIT) !== -1).equal(true);
    });

    it("User B find myPermissions on package - view only", async function () {
        const response = await userBClient.query({
            query: PackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "new-package-slug"
                }
            }
        });

        expect(response.errors == null).equal(true);

        expect(response.data.package.myPermissions?.indexOf(Permission.MANAGE) === -1).equal(true);
        expect(response.data.package.myPermissions?.indexOf(Permission.VIEW) !== -1).equal(true);
        expect(response.data.package.myPermissions?.indexOf(Permission.EDIT) === -1).equal(true);
    });

    it("User A give User B permission to package", async function () {
        const newPermissions = [Permission.VIEW, Permission.EDIT];

        const response = await userAClient.mutate({
            mutation: SetPackagePermissionsDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "new-package-slug"
                },
                value: [
                    {
                        usernameOrEmailAddress: "testB-packages",
                        permissions: newPermissions
                    }
                ],
                message: "Testing test"
            }
        });

        expect(response.errors == null).equal(true);
    });

    it("User A update User B permission to package", async function () {
        const newPermissions = [Permission.VIEW, Permission.EDIT, Permission.MANAGE];

        const response = await userAClient.mutate({
            mutation: SetPackagePermissionsDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "new-package-slug"
                },
                value: [
                    {
                        usernameOrEmailAddress: "testB-packages",
                        permissions: newPermissions
                    }
                ],
                message: "Testing test"
            }
        });

        expect(response.errors == null).equal(true);
    });

    it("User A set own permissions should fail", async function () {
        const newPermissions = [Permission.VIEW];

        const response = await userAClient.mutate({
            mutation: SetPackagePermissionsDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "new-package-slug"
                },
                value: [
                    {
                        usernameOrEmailAddress: "testA-packages",
                        permissions: newPermissions
                    }
                ],
                message: "Testing testing"
            }
        });

        expect(response.errors != null).equal(true);
        expect(response.errors?.find((e) => e.message.includes("CANNOT_SET_PACKAGE_CREATOR_PERMISSIONS"))).is.not.equal(
            null
        );
    });

    it("User B find myPermissions on package - all", async function () {
        const response = await userBClient.query({
            query: PackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "new-package-slug"
                }
            }
        });

        expect(response.errors == null).equal(true);

        expect(response.data.package.myPermissions?.indexOf(Permission.MANAGE) !== -1).equal(true);
        expect(response.data.package.myPermissions?.indexOf(Permission.VIEW) !== -1).equal(true);
        expect(response.data.package.myPermissions?.indexOf(Permission.EDIT) !== -1).equal(true);
    });

    it("User A should be able to list users with access to package", async function () {
        const response = await userAClient.query({
            query: UsersByPackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "new-package-slug"
                }
            }
        });

        expect(response.errors == null).equal(true);

        expect(response.data.usersByPackage?.length).equal(2);
    });

    it("User B can't delete permissions of creator User A", async function () {
        const response = await userAClient.mutate({
            mutation: RemovePackagePermissionsDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "new-package-slug"
                },
                usernameOrEmailAddress: "testA-packages"
            }
        });

        expect(response.errors != null).equal(true);
        expect(response.errors?.find((e) => e.message.includes("CANNOT_REMOVE_CREATOR_PERMISSIONS"))).not.equal(null);
    });

    it("Remove User B permissions on package", async function () {
        const response = await userAClient.mutate({
            mutation: RemovePackagePermissionsDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "new-package-slug"
                },
                usernameOrEmailAddress: "testB-packages"
            }
        });

        expect(response.errors == null).equal(true);
    });

    it("User A should be able to list users with access to package - after removing user B", async function () {
        const response = await userAClient.query({
            query: UsersByPackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "new-package-slug"
                }
            }
        });

        expect(response.errors == null).equal(true);

        expect(response.data.usersByPackage?.length).equal(1);
    });

    it("User B should not be able to list users with access to package - not a manager", async function () {
        const response = await userBClient.query({
            query: UsersByPackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "new-package-slug"
                }
            }
        });

        expect(response.errors != null).equal(true);

        expect(response.errors?.find((e) => e.message.includes("NOT_AUTHORIZED"))).is.not.equal(null);
    });

    it("User B find myPermissions on package - view only after permissions removed", async function () {
        const response = await userBClient.query({
            query: PackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "new-package-slug"
                }
            }
        });

        expect(response.errors == null).equal(true);

        expect(response.data.package.myPermissions?.indexOf(Permission.MANAGE) === -1).equal(true);
        expect(response.data.package.myPermissions?.indexOf(Permission.VIEW) !== -1).equal(true);
        expect(response.data.package.myPermissions?.indexOf(Permission.EDIT) === -1).equal(true);
    });

    it("User A delete package", async function () {
        const response = await userAClient.mutate({
            mutation: DeletePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "new-package-slug"
                }
            }
        });
        expect(response.errors == null, "no errors").equal(true);
    });

    it("Anonymous User get Package", async function () {
        const response = await anonymousClient.query({
            query: PackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "new-package-slug"
                }
            }
        });

        expect(response.errors != null, "should have errors").to.equal(true);
        expect(
            response.errors?.find((e) => e.message.includes("PACKAGE_NOT_FOUND")) != null,
            "should have not package not found error"
        ).equal(true);
    });

    it("Same version differences should return empty list", async function () {
        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: "testA-packages",
                    packageSlug: "diff-pkg-1",
                    displayName: "Congressional Legislators",
                    description: "Test upload of Congressional Legislators"
                }
            }
        });

        const packageFileContents = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");
        const packageFileString = JSON.stringify(packageFileContents);

        await userAClient.mutate({
            mutation: CreateVersionDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "diff-pkg-1"
                },
                value: {
                    packageFile: packageFileString
                }
            }
        });

        const version = {
            catalogSlug: "testA-packages",
            packageSlug: "diff-pkg-1",
            versionMajor: 1,
            versionMinor: 0,
            versionPatch: 0
        };

        const result = await userAClient.query({
            query: PackageVersionsDiffDocument,
            variables: {
                newVersion: version,
                oldVersion: version
            }
        });

        expect(result.errors).to.equal(undefined);
        expect(result.data).to.not.equal(undefined);
        if (result.data) {
            expect(result.data.packageVersionsDiff).to.not.equal(undefined);
            expect(result.data.packageVersionsDiff.differences).to.have.length(0);
        }
    });

    it("It should not be possible to compare packages from versions from different packages", async function () {
        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: "testA-packages",
                    packageSlug: "diff-pkg-one",
                    displayName: "Congressional Legislators",
                    description: "Test upload of Congressional Legislators"
                }
            }
        });

        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: "testA-packages",
                    packageSlug: "diff-pkg-two",
                    displayName: "Congressional Legislators",
                    description: "Test upload of Congressional Legislators"
                }
            }
        });

        const result = await userAClient.query({
            query: PackageVersionsDiffDocument,
            variables: {
                newVersion: {
                    catalogSlug: "testA-packages",
                    packageSlug: "diff-pkg-one",
                    versionMajor: 1,
                    versionMinor: 0,
                    versionPatch: 0
                },
                oldVersion: {
                    catalogSlug: "testA-packages",
                    packageSlug: "diff-pkg-two",
                    versionMajor: 1,
                    versionMinor: 0,
                    versionPatch: 1
                }
            }
        });

        expect(result.errors).to.not.equal(undefined);
        expect(result.data).to.equal(null);
        if (result.errors) {
            expect(result.errors.length).to.equal(1);
            if (result.errors[0]) {
                expect(result.errors[0].message).to.equal("DIFFERENT_VERSIONS_PACKAGES");
            }
        }
    });

    it("It should not be possible to compare packages from versions from different catalogs", async function () {
        await userAClient.mutate({
            mutation: CreateCatalogDocument,
            variables: {
                value: {
                    slug: "first-catalog",
                    displayName: "User A Catalog v1",
                    description: "This is an integration test User A v1 Catalog",
                    website: "https://usera.datapm.io",
                    isPublic: false
                }
            }
        });

        await userAClient.mutate({
            mutation: CreateCatalogDocument,
            variables: {
                value: {
                    slug: "second-catalog",
                    displayName: "User A Catalog v2",
                    description: "This is an integration test User A v2 Catalog",
                    website: "https://usera.datapm.io",
                    isPublic: false
                }
            }
        });

        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: "first-catalog",
                    packageSlug: "same-catalog-pkg",
                    displayName: "Congressional Legislators",
                    description: "Test upload of Congressional Legislators"
                }
            }
        });

        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: "second-catalog",
                    packageSlug: "same-catalog-pkg",
                    displayName: "Congressional Legislators",
                    description: "Test upload of Congressional Legislators"
                }
            }
        });

        const result = await userAClient.query({
            query: PackageVersionsDiffDocument,
            variables: {
                newVersion: {
                    catalogSlug: "first-catalog",
                    packageSlug: "same-catalog-pkg",
                    versionMajor: 1,
                    versionMinor: 0,
                    versionPatch: 0
                },
                oldVersion: {
                    catalogSlug: "second-catalog",
                    packageSlug: "same-catalog-pkg",
                    versionMajor: 1,
                    versionMinor: 0,
                    versionPatch: 1
                }
            }
        });

        expect(result.errors).to.not.equal(undefined);
        expect(result.data).to.equal(null);
        if (result.errors) {
            expect(result.errors.length).to.equal(1);
            if (result.errors[0]) {
                expect(result.errors[0].message).to.equal("DIFFERENT_VERSIONS_PACKAGES");
            }
        }
    });

    it("User should not be able to view version differences without view permissions", async function () {
        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: "testA-packages",
                    packageSlug: "user-a-pkg",
                    displayName: "Congressional Legislators",
                    description: "Test upload of Congressional Legislators"
                }
            }
        });

        const result = await userBClient.query({
            query: PackageVersionsDiffDocument,
            variables: {
                newVersion: {
                    catalogSlug: "testA-packages",
                    packageSlug: "user-a-pkg",
                    versionMajor: 1,
                    versionMinor: 0,
                    versionPatch: 0
                },
                oldVersion: {
                    catalogSlug: "testA-packages",
                    packageSlug: "user-a-pkg",
                    versionMajor: 1,
                    versionMinor: 0,
                    versionPatch: 1
                }
            }
        });

        expect(result.errors).to.not.equal(undefined);
        expect(result.data).to.equal(null);
        if (result.errors) {
            expect(result.errors.length).to.equal(1);
            if (result.errors[0]) {
                expect(result.errors[0].message).to.equal("NOT_AUTHORIZED");
            }
        }
    });

    it("It should single version difference between two different versions with no actual differences", async function () {
        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: "testA-packages",
                    packageSlug: "diff-pkg-version-changes",
                    displayName: "Congressional Legislators",
                    description: "Test upload of Congressional Legislators"
                }
            }
        });

        const packageFileContents = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");
        const packageFileString = JSON.stringify(packageFileContents);

        await userAClient.mutate({
            mutation: CreateVersionDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "diff-pkg-version-changes"
                },
                value: {
                    packageFile: packageFileString
                }
            }
        });

        const newVersionPackageFileContents = loadPackageFileFromDisk(
            "test/packageFiles/congressional-legislators-version-changed.datapm.json"
        );
        const newVersionPackageFileString = JSON.stringify(newVersionPackageFileContents);

        await userAClient.mutate({
            mutation: CreateVersionDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "diff-pkg-version-changes"
                },
                value: {
                    packageFile: newVersionPackageFileString
                }
            }
        });

        const result = await userAClient.query({
            query: PackageVersionsDiffDocument,
            variables: {
                newVersion: {
                    catalogSlug: "testA-packages",
                    packageSlug: "diff-pkg-version-changes",
                    versionMajor: 1,
                    versionMinor: 0,
                    versionPatch: 0
                },
                oldVersion: {
                    catalogSlug: "testA-packages",
                    packageSlug: "diff-pkg-version-changes",
                    versionMajor: 1,
                    versionMinor: 0,
                    versionPatch: 1
                }
            }
        });

        expect(result.errors).to.equal(undefined);
        expect(result.data).to.not.equal(undefined);
        if (result.data) {
            expect(result.data.packageVersionsDiff).to.not.equal(undefined);
            if (result.data.packageVersionsDiff) {
                expect(result.data.packageVersionsDiff.differences).to.not.have.length(0);
                if (result.data.packageVersionsDiff.differences) {
                    expect(result.data.packageVersionsDiff.differences.length).to.equal(1);
                    const difference = result.data.packageVersionsDiff.differences[0];
                    if (difference) {
                        expect(difference.type).to.equal("CHANGE_VERSION");
                    }
                }
            }
        }
    });

    it("It should return correct version differences results with changed versions", async function () {
        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: "testA-packages",
                    packageSlug: "diff-pkg-version-changes-swapped",
                    displayName: "Congressional Legislators",
                    description: "Test upload of Congressional Legislators"
                }
            }
        });

        const packageFileContents = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");
        const packageFileString = JSON.stringify(packageFileContents);

        await userAClient.mutate({
            mutation: CreateVersionDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "diff-pkg-version-changes-swapped"
                },
                value: {
                    packageFile: packageFileString
                }
            }
        });

        const newVersionPackageFileContents = loadPackageFileFromDisk(
            "test/packageFiles/congressional-legislators-version-changed.datapm.json"
        );
        const newVersionPackageFileString = JSON.stringify(newVersionPackageFileContents);

        await userAClient.mutate({
            mutation: CreateVersionDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "diff-pkg-version-changes-swapped"
                },
                value: {
                    packageFile: newVersionPackageFileString
                }
            }
        });

        const result = await userAClient.query({
            query: PackageVersionsDiffDocument,
            variables: {
                newVersion: {
                    catalogSlug: "testA-packages",
                    packageSlug: "diff-pkg-version-changes-swapped",
                    versionMajor: 1,
                    versionMinor: 0,
                    versionPatch: 0
                },
                oldVersion: {
                    catalogSlug: "testA-packages",
                    packageSlug: "diff-pkg-version-changes-swapped",
                    versionMajor: 1,
                    versionMinor: 0,
                    versionPatch: 1
                }
            }
        });

        expect(result.errors).to.equal(undefined);
        expect(result.data).to.not.equal(undefined);
        if (result.data) {
            expect(result.data.packageVersionsDiff).to.not.equal(undefined);
            if (result.data.packageVersionsDiff) {
                expect(result.data.packageVersionsDiff.differences).to.not.have.length(0);
                if (result.data.packageVersionsDiff.differences) {
                    expect(result.data.packageVersionsDiff.differences.length).to.equal(1);
                    const difference = result.data.packageVersionsDiff.differences[0];
                    if (difference) {
                        expect(difference.type).to.equal("CHANGE_VERSION");
                    }
                }
            }
        }
    });

    it("It should return version difference between two different versions with differences", async function () {
        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: "testA-packages",
                    packageSlug: "diff-pkg-version-column-changes",
                    displayName: "Congressional Legislators",
                    description: "Test upload of Congressional Legislators"
                }
            }
        });

        const packageFileContents = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");
        const packageFileString = JSON.stringify(packageFileContents);

        await userAClient.mutate({
            mutation: CreateVersionDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "diff-pkg-version-column-changes"
                },
                value: {
                    packageFile: packageFileString
                }
            }
        });

        const newVersionPackageFileContents = loadPackageFileFromDisk(
            "test/packageFiles/congressional-legislators-updated.datapm.json"
        );
        const newVersionPackageFileString = JSON.stringify(newVersionPackageFileContents);

        await userAClient.mutate({
            mutation: CreateVersionDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "diff-pkg-version-column-changes"
                },
                value: {
                    packageFile: newVersionPackageFileString
                }
            }
        });

        const result = await userAClient.query({
            query: PackageVersionsDiffDocument,
            variables: {
                newVersion: {
                    catalogSlug: "testA-packages",
                    packageSlug: "diff-pkg-version-column-changes",
                    versionMajor: 1,
                    versionMinor: 0,
                    versionPatch: 0
                },
                oldVersion: {
                    catalogSlug: "testA-packages",
                    packageSlug: "diff-pkg-version-column-changes",
                    versionMajor: 2,
                    versionMinor: 0,
                    versionPatch: 0
                }
            }
        });

        expect(result.errors).to.equal(undefined);
        expect(result.data).to.not.equal(undefined);
        if (result.data) {
            expect(result.data.packageVersionsDiff).to.not.equal(undefined);
            if (result.data.packageVersionsDiff) {
                expect(result.data.packageVersionsDiff.differences).to.not.have.length(0);
                const differences = result.data.packageVersionsDiff.differences;
                if (differences) {
                    expect(differences.length).to.equal(4);
                    if (differences) {
                        if (differences[0] && differences[1] && differences[2] && differences[3]) {
                            expect(differences[0].pointer).to.equal("#");
                            expect(differences[0].type).to.equal("CHANGE_VERSION");

                            expect(differences[1].pointer).to.equal("#/legislators-current.csv/properties/last_name");
                            expect(differences[1].type).to.equal("REMOVE_PROPERTY");

                            expect(differences[2].pointer).to.equal("#/legislators-current.csv/properties/middle_name");
                            expect(differences[2].type).to.equal("REMOVE_PROPERTY");

                            expect(differences[3].pointer).to.equal("#/legislators-current.csv/properties/nick_name");
                            expect(differences[3].type).to.equal("ADD_PROPERTY");
                        }
                    }
                }
            }
        }
    });

    it("It should return version difference between two different versions (swapped) with differences", async function () {
        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: "testA-packages",
                    packageSlug: "diff-pkg-version-column-changes-sw",
                    displayName: "Congressional Legislators",
                    description: "Test upload of Congressional Legislators"
                }
            }
        });

        const packageFileContents = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");
        const packageFileString = JSON.stringify(packageFileContents);

        await userAClient.mutate({
            mutation: CreateVersionDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "diff-pkg-version-column-changes-sw"
                },
                value: {
                    packageFile: packageFileString
                }
            }
        });

        const newVersionPackageFileContents = loadPackageFileFromDisk(
            "test/packageFiles/congressional-legislators-updated.datapm.json"
        );
        const newVersionPackageFileString = JSON.stringify(newVersionPackageFileContents);

        await userAClient.mutate({
            mutation: CreateVersionDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "diff-pkg-version-column-changes-sw"
                },
                value: {
                    packageFile: newVersionPackageFileString
                }
            }
        });

        const result = await userAClient.query({
            query: PackageVersionsDiffDocument,
            variables: {
                newVersion: {
                    catalogSlug: "testA-packages",
                    packageSlug: "diff-pkg-version-column-changes-sw",
                    versionMajor: 2,
                    versionMinor: 0,
                    versionPatch: 0
                },
                oldVersion: {
                    catalogSlug: "testA-packages",
                    packageSlug: "diff-pkg-version-column-changes-sw",
                    versionMajor: 1,
                    versionMinor: 0,
                    versionPatch: 0
                }
            }
        });

        expect(result.errors).to.equal(undefined);
        expect(result.data).to.not.equal(undefined);
        if (result.data) {
            expect(result.data.packageVersionsDiff).to.not.equal(undefined);
            if (result.data.packageVersionsDiff) {
                expect(result.data.packageVersionsDiff.differences).to.not.have.length(0);
                const differences = result.data.packageVersionsDiff.differences;
                if (differences) {
                    expect(differences.length).to.equal(4);
                    if (differences) {
                        if (differences[0] && differences[1] && differences[2] && differences[3]) {
                            expect(differences[0].pointer).to.equal("#");
                            expect(differences[0].type).to.equal("CHANGE_VERSION");

                            expect(differences[1].pointer).to.equal("#/legislators-current.csv/properties/last_name");
                            expect(differences[1].type).to.equal("REMOVE_PROPERTY");

                            expect(differences[2].pointer).to.equal("#/legislators-current.csv/properties/middle_name");
                            expect(differences[2].type).to.equal("REMOVE_PROPERTY");

                            expect(differences[3].pointer).to.equal("#/legislators-current.csv/properties/nick_name");
                            expect(differences[3].type).to.equal("ADD_PROPERTY");
                        }
                    }
                }
            }
        }
    });

    it("It should return versions differences between paginated versions of a package", async function () {
        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: "testA-packages",
                    packageSlug: "diff-pkg-versions-column-changes",
                    displayName: "Congressional Legislators",
                    description: "Test upload of Congressional Legislators"
                }
            }
        });

        const packageFileContents = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");
        const packageFileString = JSON.stringify(packageFileContents);

        await userAClient.mutate({
            mutation: CreateVersionDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "diff-pkg-versions-column-changes"
                },
                value: {
                    packageFile: packageFileString
                }
            }
        });

        const newVersionPackageFileContents = loadPackageFileFromDisk(
            "test/packageFiles/congressional-legislators-version-changed.datapm.json"
        );
        const newVersionPackageFileString = JSON.stringify(newVersionPackageFileContents);

        await userAClient.mutate({
            mutation: CreateVersionDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "diff-pkg-versions-column-changes"
                },
                value: {
                    packageFile: newVersionPackageFileString
                }
            }
        });

        const newerVersionPackageFileContents = loadPackageFileFromDisk(
            "test/packageFiles/congressional-legislators-updated.datapm.json"
        );
        const newerVersionPackageFileString = JSON.stringify(newerVersionPackageFileContents);

        await userAClient.mutate({
            mutation: CreateVersionDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "diff-pkg-versions-column-changes"
                },
                value: {
                    packageFile: newerVersionPackageFileString
                }
            }
        });

        const result = await userAClient.query({
            query: PackageVersionsDiffsDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "diff-pkg-versions-column-changes"
                },
                offset: 0,
                limit: 10
            }
        });

        expect(result.errors).to.equal(undefined);
        expect(result.data).to.not.equal(undefined);
        if (result.data) {
            expect(result.data.packageVersionsDiffs).to.not.equal(undefined);
            if (result.data.packageVersionsDiffs) {
                expect(result.data.packageVersionsDiffs).to.not.have.length(0);
                const differenceSets = result.data.packageVersionsDiffs;
                expect(differenceSets.length).to.equal(2);

                const latestVersionDiff = differenceSets[0];
                expect(latestVersionDiff).to.not.equal(null);
                expect(latestVersionDiff.newVersion).to.not.equal(null);
                expect(latestVersionDiff.oldVersion).to.not.equal(null);
                expect(latestVersionDiff.differences).to.not.equal(null);

                if (latestVersionDiff.newVersion && latestVersionDiff.oldVersion && latestVersionDiff.differences) {
                    expect(latestVersionDiff.newVersion.versionMajor).to.equal(2);
                    expect(latestVersionDiff.newVersion.versionMinor).to.equal(0);
                    expect(latestVersionDiff.newVersion.versionPatch).to.equal(0);
                    expect(latestVersionDiff.oldVersion.versionMajor).to.equal(1);
                    expect(latestVersionDiff.oldVersion.versionMinor).to.equal(0);
                    expect(latestVersionDiff.oldVersion.versionPatch).to.equal(1);
                    expect(latestVersionDiff.differences.length).to.equal(4);

                    const differences = latestVersionDiff.differences;
                    expect(differences).to.not.equal(null);
                    if (differences) {
                        expect(differences.length).to.equal(4);
                        if (differences) {
                            if (differences[0] && differences[1] && differences[2] && differences[3]) {
                                expect(differences[0].pointer).to.equal("#");
                                expect(differences[0].type).to.equal("CHANGE_VERSION");

                                expect(differences[1].pointer).to.equal(
                                    "#/legislators-current.csv/properties/last_name"
                                );
                                expect(differences[1].type).to.equal("REMOVE_PROPERTY");

                                expect(differences[2].pointer).to.equal(
                                    "#/legislators-current.csv/properties/middle_name"
                                );
                                expect(differences[2].type).to.equal("REMOVE_PROPERTY");

                                expect(differences[3].pointer).to.equal(
                                    "#/legislators-current.csv/properties/nick_name"
                                );
                                expect(differences[3].type).to.equal("ADD_PROPERTY");
                            }
                        }
                    }
                }

                const firstVersionDiff = differenceSets[1];
                if (firstVersionDiff.newVersion && firstVersionDiff.oldVersion && firstVersionDiff.differences) {
                    expect(firstVersionDiff.newVersion.versionMajor).to.equal(1);
                    expect(firstVersionDiff.newVersion.versionMinor).to.equal(0);
                    expect(firstVersionDiff.newVersion.versionPatch).to.equal(1);
                    expect(firstVersionDiff.oldVersion.versionMajor).to.equal(1);
                    expect(firstVersionDiff.oldVersion.versionMinor).to.equal(0);
                    expect(firstVersionDiff.oldVersion.versionPatch).to.equal(0);
                    expect(firstVersionDiff.differences.length).to.equal(1);

                    const difference = firstVersionDiff.differences[0];
                    expect(difference).to.not.equal(null);
                    if (difference) {
                        expect(difference.type).to.equal("CHANGE_VERSION");
                    }
                }
            }
        }
    });
});
