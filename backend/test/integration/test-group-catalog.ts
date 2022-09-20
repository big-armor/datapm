import { NormalizedCacheObject } from "@apollo/client/cache";
import { ApolloClient } from "@apollo/client/core";
import { expect } from "chai";
import { loadPackageFileFromDisk, parsePackageFileJSON } from "datapm-lib";
import { describe } from "mocha";
import {
    AddOrUpdateGroupToCatalogDocument,
    AddOrUpdateUserToGroupDocument,
    AutoCompleteCatalogDocument,
    AutoCompletePackageDocument,
    CreateGroupDocument,
    CreatePackageDocument,
    CreateVersionDocument,
    GroupsByCatalogDocument,
    PackageDocument,
    Permission,
    RemoveGroupFromCatalogDocument,
    UpdateCatalogDocument,
    UpdatePackageDocument
} from "./registry-client";
import { createAnonymousClient, createUser } from "./test-utils";

describe("Group Package Access", () => {
    let userAClient: ApolloClient<NormalizedCacheObject>;
    let userBClient: ApolloClient<NormalizedCacheObject>;
    const anonymousClient = createAnonymousClient();

    before(async () => {
        userAClient = await createUser(
            "FirstA",
            "LastA",
            "testA-group-catalog",
            "testA-group-catalog@test.datapm.io",
            "passwordA!"
        );
        userBClient = await createUser(
            "FirstB",
            "LastB",
            "testB-group-catalog",
            "testB-group-catalog@test.datapm.io",
            "passwordB!"
        );
        expect(userAClient).to.not.equal(undefined);
        expect(userBClient).to.not.equal(undefined);
    });

    it("Should allow user to create a package", async function () {
        const response = await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: "testA-group-catalog",
                    packageSlug: "congressional-legislators",
                    displayName: "Congressional Legislators",
                    description: "Test upload of congressional legislators"
                }
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
        expect(response.data?.createPackage.catalog?.displayName).to.equal("testA-group-catalog");
        expect(response.data?.createPackage.description).to.equal("Test upload of congressional legislators");
        expect(response.data?.createPackage.displayName).to.equal("Congressional Legislators");
        expect(response.data?.createPackage.identifier.catalogSlug).to.equal("testA-group-catalog");
        expect(response.data?.createPackage.identifier.packageSlug).to.equal("congressional-legislators");
        expect(response.data?.createPackage.latestVersion).to.equal(null);
    });

    it("User A publish first version", async function () {
        const packageFileContents = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");

        const packageFileString = JSON.stringify(packageFileContents);

        let response;
        try {
            response = await userAClient.mutate({
                mutation: CreateVersionDocument,
                variables: {
                    identifier: {
                        catalogSlug: "testA-group-catalog",
                        packageSlug: "congressional-legislators"
                    },
                    value: {
                        packageFile: packageFileString
                    }
                }
            });
        } catch (error) {
            console.error(JSON.stringify(error, null, 1));
            return;
        }

        expect(response.errors == null, "no errors").equal(true);
        expect(response.data?.createVersion.author?.username).equal("testA-group-catalog");

        const responsePackageFileContents = response.data?.createVersion.packageFile;

        const packageFile = parsePackageFileJSON(responsePackageFileContents);

        expect(packageFile.readmeMarkdown).includes("This is where a readme might go");
        expect(packageFile.licenseMarkdown).includes("This is not a real license. Just a test.");
    });

    it("package should not be available anonymously", async function () {
        const response = await anonymousClient.query({
            query: PackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-group-catalog",
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
                    catalogSlug: "testA-group-catalog",
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

    it("Create group", async () => {
        const response = await userAClient.mutate({
            mutation: CreateGroupDocument,
            variables: {
                groupSlug: "test-group-catalog",
                name: "Test Group",
                description: "Test group description"
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
    });

    it("Add userB to group with view permission", async () => {
        const response = await userAClient.mutate({
            mutation: AddOrUpdateUserToGroupDocument,
            variables: {
                groupSlug: "test-group-catalog",
                userPermissions: [
                    {
                        usernameOrEmailAddress: "testB-group-catalog",
                        permissions: [Permission.VIEW]
                    }
                ]
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
    });

    it("Grant group view access to catalog and packages", async () => {
        const response = await userAClient.mutate({
            mutation: AddOrUpdateGroupToCatalogDocument,
            variables: {
                groupSlug: "test-group-catalog",
                catalogIdentifier: {
                    catalogSlug: "testA-group-catalog"
                },
                packagePermissions: [Permission.VIEW],
                permissions: [Permission.VIEW]
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
    });

    it("UserB should be able to view package", async () => {
        const response = await userBClient.query({
            query: PackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-group-catalog",
                    packageSlug: "congressional-legislators"
                }
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
        expect(response.data?.package.displayName).to.equal("Congressional Legislators");
    });

    it("Package should appear in userB auto-complete", async () => {
        const response = await userBClient.query({
            query: AutoCompletePackageDocument,
            variables: {
                startsWith: "Congressional"
            }
        });

        expect(response.error == null, "no errors").equal(true);
        expect(
            response.data?.autoComplete.packages?.find(
                (p) =>
                    p.identifier.catalogSlug === "testA-group-catalog" &&
                    p.identifier.packageSlug === "congressional-legislators"
            ) != null
        ).equal(true);
    });

    it("Catalog should appear in userB auto-complete", async () => {
        const response = await userBClient.query({
            query: AutoCompleteCatalogDocument,
            variables: {
                startsWith: "testA-group-catalog"
            }
        });

        expect(response.error == null, "no errors").equal(true);
        expect(
            response.data?.autoComplete.catalogs?.find((c) => c.identifier.catalogSlug === "testA-group-catalog") !=
                null
        ).equal(true);
    });

    it("UserB should not be able to modify package", async () => {
        const response = await userBClient.mutate({
            mutation: UpdatePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-group-catalog",
                    packageSlug: "congressional-legislators"
                },
                value: {
                    description: "This is a test package"
                }
            }
        });

        if (response.errors == null) throw new Error("response.errors is null");
        expect(response.errors != null, "should have errors").to.equal(true);
        expect(response.errors[0].message).to.equal("NOT_AUTHORIZED");
    });

    it("Grant group edit access to package", async () => {
        const response = await userAClient.mutate({
            mutation: AddOrUpdateGroupToCatalogDocument,
            variables: {
                groupSlug: "test-group-catalog",
                catalogIdentifier: {
                    catalogSlug: "testA-group-catalog"
                },
                permissions: [Permission.VIEW],
                packagePermissions: [Permission.VIEW, Permission.EDIT, Permission.MANAGE]
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
    });

    it("UserB should be able to modify package", async () => {
        const response = await userBClient.mutate({
            mutation: UpdatePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-group-catalog",
                    packageSlug: "congressional-legislators"
                },
                value: {
                    description: "This is a test package"
                }
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
        expect(response.data?.updatePackage.description).to.equal("This is a test package");
    });

    it("UserB should no be able to edit catalog", async () => {
        const response = await userBClient.mutate({
            mutation: UpdateCatalogDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-group-catalog"
                },
                value: {
                    displayName: "Test Catalog2"
                }
            }
        });

        expect(response.errors != null, "should have errors").to.equal(true);
    });

    it("Grant group edit access to package", async () => {
        const response = await userAClient.mutate({
            mutation: AddOrUpdateGroupToCatalogDocument,
            variables: {
                groupSlug: "test-group-catalog",
                catalogIdentifier: {
                    catalogSlug: "testA-group-catalog"
                },
                permissions: [Permission.VIEW, Permission.EDIT],
                packagePermissions: [Permission.VIEW, Permission.EDIT, Permission.MANAGE]
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
    });

    it("Should allow UserB to edit catalog", async () => {
        const response = await userBClient.mutate({
            mutation: UpdateCatalogDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-group-catalog"
                },
                value: {
                    displayName: "Test Catalog2"
                }
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
        expect(response.data?.updateCatalog.displayName).to.equal("Test Catalog2");
    });

    it("UserB should not be able to remove a group", async () => {
        const response = await userBClient.mutate({
            mutation: RemoveGroupFromCatalogDocument,
            variables: {
                groupSlug: "test-group-catalog",
                catalogIdentifier: {
                    catalogSlug: "testA-group-catalog"
                }
            }
        });

        if (response.errors == null) throw new Error("response.errors is null");

        expect(response.errors != null, "should have errors").to.equal(true);
        expect(response.errors[0].message).to.equal("NOT_AUTHORIZED");
    });

    it("Grant group manage access to catalog", async () => {
        const response = await userAClient.mutate({
            mutation: AddOrUpdateGroupToCatalogDocument,
            variables: {
                groupSlug: "test-group-catalog",
                catalogIdentifier: {
                    catalogSlug: "testA-group-catalog"
                },
                packagePermissions: [Permission.VIEW, Permission.EDIT, Permission.MANAGE],
                permissions: [Permission.VIEW]
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
    });

    it("Should return group list for catalog", async () => {
        const response = await userAClient.query({
            query: GroupsByCatalogDocument,
            variables: {
                catalogIdentifier: {
                    catalogSlug: "testA-group-catalog"
                }
            }
        });

        expect(response.errors == null).equal(true);
        expect(response.data.groupsByCatalog.length).to.equal(1);
        expect(response.data.groupsByCatalog[0].group?.slug).equal("test-group-catalog");

        expect(response.data.groupsByCatalog[0].permissions?.length).equal(1);

        if (response.data.groupsByCatalog[0].permissions == null)
            throw new Error("response.data.groupsByCatalog[0].permissions is null");

        expect(response.data.groupsByCatalog[0].permissions[0]).equal(Permission.VIEW);

        expect(response.data.groupsByCatalog[0].packagePermissions?.length).equal(3);
    });

    it("UserA should be able to remove a group", async () => {
        const response = await userAClient.mutate({
            mutation: RemoveGroupFromCatalogDocument,
            variables: {
                groupSlug: "test-group-catalog",
                catalogIdentifier: {
                    catalogSlug: "testA-group-catalog"
                }
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
    });

    it("package should not be available to user B", async function () {
        const response = await userBClient.query({
            query: PackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-group-catalog",
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
});
