import { NormalizedCacheObject } from "@apollo/client/cache";
import { ApolloClient } from "@apollo/client/core";
import { expect } from "chai";
import { loadPackageFileFromDisk, parsePackageFileJSON } from "datapm-lib";
import { describe } from "mocha";
import {
    AddOrUpdateGroupToCatalogDocument,
    AddOrUpdateGroupToCollectionDocument,
    AddOrUpdateGroupToPackageDocument,
    AddOrUpdateUserToGroupDocument,
    AddPackageToCollectionDocument,
    CollectionDocument,
    CreateCollectionDocument,
    CreateGroupDocument,
    CreatePackageDocument,
    CreateVersionDocument,
    GroupsByCollectionDocument,
    PackageDocument,
    Permission,
    RemoveGroupFromCatalogDocument,
    RemoveGroupFromCollectionDocument,
    RemoveGroupFromPackageDocument,
    SearchCollectionsDocument,
    UpdateCatalogDocument,
    UpdateCollectionDocument,
    UpdatePackageDocument
} from "./registry-client";
import { createAnonymousClient, createUser } from "./test-utils";

describe("Group Collection Access", () => {
    let userAClient: ApolloClient<NormalizedCacheObject>;
    let userBClient: ApolloClient<NormalizedCacheObject>;
    const anonymousClient = createAnonymousClient();

    before(async () => {
        userAClient = await createUser(
            "FirstA",
            "LastA",
            "testA-group-collection",
            "testA-group-collection@test.datapm.io",
            "passwordA!"
        );
        userBClient = await createUser(
            "FirstB",
            "LastB",
            "testB-group-collection",
            "testB-group-collection@test.datapm.io",
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
                    catalogSlug: "testA-group-collection",
                    packageSlug: "congressional-legislators",
                    displayName: "Congressional Legislators",
                    description: "Test upload of congressional legislators"
                }
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
        expect(response.data?.createPackage.catalog?.displayName).to.equal("testA-group-collection");
        expect(response.data?.createPackage.description).to.equal("Test upload of congressional legislators");
        expect(response.data?.createPackage.displayName).to.equal("Congressional Legislators");
        expect(response.data?.createPackage.identifier.catalogSlug).to.equal("testA-group-collection");
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
                        catalogSlug: "testA-group-collection",
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
        expect(response.data?.createVersion.author?.username).equal("testA-group-collection");

        const responsePackageFileContents = response.data?.createVersion.packageFile;

        const packageFile = parsePackageFileJSON(responsePackageFileContents);

        expect(packageFile.readmeMarkdown).includes("This is where a readme might go");
        expect(packageFile.licenseMarkdown).includes("This is not a real license. Just a test.");
    });

    it("Should create a collection", async function () {
        const response = await userAClient.mutate({
            mutation: CreateCollectionDocument,
            variables: {
                value: {
                    collectionSlug: "testA-group-collection",
                    name: "Test Collection",
                    description: "Test collection",
                    isPublic: false
                }
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
    });

    it("Should add package to collection", async function () {
        const response = await userAClient.mutate({
            mutation: AddPackageToCollectionDocument,
            variables: {
                collectionIdentifier: {
                    collectionSlug: "testA-group-collection"
                },
                packageIdentifier: {
                    catalogSlug: "testA-group-collection",
                    packageSlug: "congressional-legislators"
                }
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
    });

    it("Collection should not be available anonymously", async function () {
        const response = await anonymousClient.query({
            query: CollectionDocument,
            variables: {
                identifier: {
                    collectionSlug: "testA-group-collection"
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
                    catalogSlug: "testA-group-collection",
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
                groupSlug: "test-group-collection",
                name: "Test Group",
                description: "Test group"
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
    });

    it("Add userB to group with view permission", async () => {
        const response = await userAClient.mutate({
            mutation: AddOrUpdateUserToGroupDocument,
            variables: {
                groupSlug: "test-group-collection",
                userPermissions: {
                    usernameOrEmailAddress: "testB-group-collection",
                    permissions: [Permission.VIEW]
                }
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
    });

    it("Grant group view access to catalog and packages", async () => {
        const response = await userAClient.mutate({
            mutation: AddOrUpdateGroupToCatalogDocument,
            variables: {
                groupSlug: "test-group-collection",
                catalogIdentifier: {
                    catalogSlug: "testA-group-collection"
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
                    catalogSlug: "testA-group-collection",
                    packageSlug: "congressional-legislators"
                }
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
        expect(response.data?.package.displayName).to.equal("Congressional Legislators");
    });

    it("UserB should not be able to view collection", async () => {
        const response = await userBClient.mutate({
            mutation: CollectionDocument,
            variables: {
                identifier: {
                    collectionSlug: "testA-group-collection"
                }
            }
        });

        if (response.errors == null) throw new Error("Should have errors");
        expect(response.errors != null, "should have errors").to.equal(true);
        expect(response.errors[0].message).to.equal("NOT_AUTHORIZED");
    });

    it("Grant group edit access to view collection", async () => {
        const response = await userAClient.mutate({
            mutation: AddOrUpdateGroupToCollectionDocument,
            variables: {
                groupSlug: "test-group-collection",
                collectionIdentifier: {
                    collectionSlug: "testA-group-collection"
                },
                permissions: [Permission.VIEW]
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
    });

    it("Should return group list for collection", async () => {
        const response = await userAClient.query({
            query: GroupsByCollectionDocument,
            variables: {
                collectionIdentifier: {
                    collectionSlug: "testA-group-collection"
                }
            }
        });

        expect(response.errors == null).equal(true);
        expect(response.data.groupsByCollection.length).to.equal(1);
        expect(response.data.groupsByCollection[0].group?.slug).equal("test-group-collection");

        expect(response.data.groupsByCollection[0].permissions?.length).equal(1);

        if (response.data.groupsByCollection[0].permissions == null) throw new Error("Should have permissions");
        expect(response.data.groupsByCollection[0].permissions[0]).equal(Permission.VIEW);
    });

    it("UserB should not be able to view collection", async () => {
        const response = await userBClient.mutate({
            mutation: CollectionDocument,
            variables: {
                identifier: {
                    collectionSlug: "testA-group-collection"
                }
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);

        expect(response.data?.collection.name).to.equal("Test Collection");
    });

    it("UserB should no be able to edit collection", async () => {
        const response = await userBClient.mutate({
            mutation: UpdateCollectionDocument,
            variables: {
                identifier: {
                    collectionSlug: "testA-group-collection"
                },
                value: {
                    name: "Test Catalog2"
                }
            }
        });

        expect(response.errors != null, "should have errors").to.equal(true);
    });

    it("Grant group edit access to collection", async () => {
        const response = await userAClient.mutate({
            mutation: AddOrUpdateGroupToCollectionDocument,
            variables: {
                groupSlug: "test-group-collection",
                collectionIdentifier: {
                    collectionSlug: "testA-group-collection"
                },
                permissions: [Permission.VIEW, Permission.EDIT]
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
    });

    it("Should allow UserB to edit collection", async () => {
        const response = await userBClient.mutate({
            mutation: UpdateCollectionDocument,
            variables: {
                identifier: {
                    collectionSlug: "testA-group-collection"
                },
                value: {
                    name: "Test Collection2"
                }
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
        expect(response.data?.updateCollection.name).to.equal("Test Collection2");
    });

    it("Should include collection in search for userB", async () => {
        const response = await userBClient.query({
            query: SearchCollectionsDocument,
            variables: {
                query: "Test Collection2",
                limit: 10,
                offset: 0
            }
        });

        if (response.data?.searchCollections.collections == null) {
            throw new Error("Should have collections");
        }
        expect(response.errors == null, "no errors").to.equal(true);
        expect(response.data?.searchCollections.collections?.length).to.equal(1);
        expect(response.data?.searchCollections.collections[0].name).to.equal("Test Collection2");
    });

    it("UserB should not be able to remove a group", async () => {
        const response = await userBClient.mutate({
            mutation: RemoveGroupFromCollectionDocument,
            variables: {
                groupSlug: "test-group-collection",
                collectionIdentifier: {
                    collectionSlug: "testA-group-collection"
                }
            }
        });

        if (response.errors == null) throw new Error("Should have errors");
        expect(response.errors != null, "should have errors").to.equal(true);
        expect(response.errors[0].message).to.equal("NOT_AUTHORIZED");
    });

    it("UserA should be able to remove a group", async () => {
        const response = await userAClient.mutate({
            mutation: RemoveGroupFromCollectionDocument,
            variables: {
                groupSlug: "test-group-collection",
                collectionIdentifier: {
                    collectionSlug: "testA-group-collection"
                }
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
    });

    it("Collection should not be available to user B", async function () {
        const response = await userBClient.query({
            query: CollectionDocument,
            variables: {
                identifier: {
                    collectionSlug: "testA-group-collection"
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
