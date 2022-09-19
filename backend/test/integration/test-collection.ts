import { ApolloClient, NormalizedCacheObject, ServerError } from "@apollo/client/core";
import { ErrorResponse } from "apollo-link-error";
import { expect } from "chai";
import {
    CreatePackageDocument,
    CreateCollectionDocument,
    AddPackageToCollectionDocument,
    UpdatePackageDocument,
    UpdateCatalogDocument,
    CollectionDocument,
    UpdateCollectionDocument,
    DeleteCollectionDocument,
    MyCollectionsDocument,
    CollectionPackagesDocument,
    CreateVersionDocument,
    UserCollectionsDocument,
    RemovePackageFromCollectionDocument,
    CollectionSlugAvailableDocument
} from "./registry-client";
import { createAnonymousClient, createUser } from "./test-utils";
import { describe, it } from "mocha";
import { loadPackageFileFromDisk } from "datapm-lib";

describe("Collection Tests", async () => {
    let userAClient: ApolloClient<NormalizedCacheObject>;
    let userBClient: ApolloClient<NormalizedCacheObject>;
    const anonymousUser = createAnonymousClient();

    it("Create users A & B", async function () {
        userAClient = await createUser(
            "FirstA",
            "LastA",
            "testA-collection",
            "testA-collection@test.datapm.io",
            "passwordA!"
        );
        userBClient = await createUser(
            "FirstB",
            "LastB",
            "testB-collection",
            "testB-collection@test.datapm.io",
            "passwordB!"
        );
        expect(userAClient).to.not.equal(undefined);
        expect(userBClient).to.not.equal(undefined);
    });

    it("Should allow user to see own collections", async function () {
        await userAClient.mutate({
            mutation: CreateCollectionDocument,
            variables: {
                value: {
                    collectionSlug: "testA-collection",
                    name: "test a collection",
                    description: "Short test A"
                }
            }
        });

        await userBClient.mutate({
            mutation: CreateCollectionDocument,
            variables: {
                value: {
                    collectionSlug: "testB-collection-one",
                    name: "test b collection",
                    description: "Short test B"
                }
            }
        });

        await userBClient.mutate({
            mutation: CreateCollectionDocument,
            variables: {
                value: {
                    collectionSlug: "testB-collection-two",
                    name: "test b collection",
                    description: "Short test B"
                }
            }
        });

        const findMyCollectionsA = await userAClient.query({
            query: MyCollectionsDocument,
            variables: {
                offSet: 0,
                limit: 5
            }
        });

        const findMyCollectionsB = await userBClient.query({
            query: MyCollectionsDocument,
            variables: {
                offSet: 0,
                limit: 5
            }
        });

        expect(findMyCollectionsA.data.myCollections.count).to.equal(1);
        expect(findMyCollectionsB.data.myCollections.count).to.equal(2);
    });

    it("Should return Collection slug not available", async function () {
        const response = await userBClient.query({
            query: CollectionSlugAvailableDocument,
            variables: {
                collectionSlug: "testA-collection"
            }
        });

        expect(response.errors == null).equal(true);
        expect(response.data.collectionSlugAvailable).equal(false);
    });

    it("Should return Collection slug not available for reserved word", async function () {
        const response = await userBClient.query({
            query: CollectionSlugAvailableDocument,
            variables: {
                collectionSlug: "trending"
            }
        });

        expect(response.errors == null).equal(true);
        expect(response.data.collectionSlugAvailable).equal(false);
    });

    it("Should return Collection slug available", async function () {
        const response = await userBClient.query({
            query: CollectionSlugAvailableDocument,
            variables: {
                collectionSlug: "something-that-is-not-taken-96"
            }
        });

        expect(response.errors == null).equal(true);
        expect(response.data.collectionSlugAvailable).equal(true);
    });

    it("Should allow user to create a package", async function () {
        const response = await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: "testA-collection",
                    packageSlug: "congressional-legislators",
                    displayName: "Congressional Legislators",
                    description: "Test upload of congressional legislators"
                }
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
        expect(response.data?.createPackage.catalog?.displayName).to.equal("testA-collection");
        expect(response.data?.createPackage.description).to.equal("Test upload of congressional legislators");
        expect(response.data?.createPackage.displayName).to.equal("Congressional Legislators");
        expect(response.data?.createPackage.identifier.catalogSlug).to.equal("testA-collection");
        expect(response.data?.createPackage.identifier.packageSlug).to.equal("congressional-legislators");
        expect(response.data?.createPackage.latestVersion).to.equal(null);
    });

    it("Get collection that does not exist", async function () {
        const response = await anonymousUser.query({
            query: CollectionDocument,
            variables: {
                identifier: {
                    collectionSlug: "some-collection"
                }
            }
        });

        if (response.errors == null) {
            throw new Error("Expected error");
        }
        expect(response.errors != null, "has error").equal(true);
        expect(response.errors[0].message).equal("COLLECTION_NOT_FOUND");
    });

    it("Create Collection with invalid slug", async function () {
        let errorFound = false;
        const response = await userBClient
            .mutate({
                mutation: CreateCollectionDocument,
                variables: {
                    value: {
                        collectionSlug: "testB-collection-",
                        name: "test b collection",
                        description: "Short test"
                    }
                }
            })
            .catch((error: ErrorResponse) => {
                const fetchResult = error.networkError as ServerError;
                if (
                    fetchResult.result.errors.find(
                        (e: { extensions: { exception: { stacktrace: string[] } } }) =>
                            e.extensions.exception.stacktrace.find((s) =>
                                s.startsWith("ValidationError: COLLECTION_SLUG_INVALID")
                            ) != null
                    ) != null
                )
                    errorFound = true;
            })
            .then((client) => {
                expect(errorFound, "error not found").equal(true);
            });
    });

    it("User B create a collection", async function () {
        const response = await userBClient.mutate({
            mutation: CreateCollectionDocument,
            variables: {
                value: {
                    collectionSlug: "testB-collection",
                    name: "test b collection",
                    description: "Short test"
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);
        expect(response.data?.createCollection.creator?.username).equal("testB-collection");
        expect(response.data?.createCollection.identifier.collectionSlug).equal("testB-collection");
        expect(response.data?.createCollection.name).equal("test b collection");
        expect(response.data?.createCollection.description).equal("Short test");
    });

    it("User B create a collection - slug collision", async function () {
        const response = await userBClient.mutate({
            mutation: CreateCollectionDocument,
            variables: {
                value: {
                    collectionSlug: "testB-collection",
                    name: "test b collection",
                    description: "Short test"
                }
            }
        });

        if (response.errors == null) {
            throw new Error("Expected error");
        }

        expect(response.errors != null, "has errors").equal(true);
        expect(response.errors[0].message).equal("COLLECTION_SLUG_NOT_AVAILABLE");
    });

    it("User B add package to collection - fail for permissions", async function () {
        const response = await userBClient.mutate({
            mutation: AddPackageToCollectionDocument,
            variables: {
                collectionIdentifier: {
                    collectionSlug: "testB-collection"
                },
                packageIdentifier: {
                    catalogSlug: "testA-collection",
                    packageSlug: "congressional-legislators"
                }
            }
        });

        if (response.errors == null) {
            throw new Error("Expected error");
        }

        expect(response.errors != null, "has errors").equal(true);
        expect(response.errors[0].message).equal("NOT_AUTHORIZED");
    });

    it("User A make catalog public", async function () {
        const response = await userAClient.mutate({
            mutation: UpdateCatalogDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-collection"
                },
                value: {
                    isPublic: true
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);
    });

    it("User A publish first version", async function () {
        const packageFileContents = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");

        const packageFileString = JSON.stringify(packageFileContents);

        const response = await userAClient.mutate({
            mutation: CreateVersionDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-collection",
                    packageSlug: "congressional-legislators"
                },
                value: {
                    packageFile: packageFileString
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);
    });

    it("User A make package public", async function () {
        const response = await userAClient.mutate({
            mutation: UpdatePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-collection",
                    packageSlug: "congressional-legislators"
                },
                value: {
                    isPublic: true
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);
    });

    it("User A make catalog public", async function () {
        const response = await userAClient.mutate({
            mutation: UpdateCatalogDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-collection"
                },
                value: {
                    isPublic: true
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);
    });

    it("Adding a package to a collection changes its update date", async function () {
        await userAClient.mutate({
            mutation: CreateCollectionDocument,
            variables: {
                value: {
                    collectionSlug: "test-update-collection",
                    name: "test-update-collection",
                    description: "test-update-collection"
                }
            }
        });

        const collectionBeforeUpdate = await userAClient.query({
            query: CollectionDocument,
            variables: {
                identifier: {
                    collectionSlug: "test-update-collection"
                }
            }
        });
        const oldUpdatedDate = collectionBeforeUpdate.data.collection.updatedAt;

        const response = await userAClient.mutate({
            mutation: AddPackageToCollectionDocument,
            variables: {
                collectionIdentifier: {
                    collectionSlug: "test-update-collection"
                },
                packageIdentifier: {
                    catalogSlug: "testA-collection",
                    packageSlug: "congressional-legislators"
                }
            }
        });

        const collectionAfterUpdate = await userAClient.query({
            query: CollectionDocument,
            variables: {
                identifier: {
                    collectionSlug: "test-update-collection"
                }
            }
        });
        const newUpdatedDate = collectionAfterUpdate.data.collection.updatedAt;

        expect(response.errors != null).equal(false);
        expect(oldUpdatedDate != null).equal(true);
        expect(newUpdatedDate != null).equal(true);
        expect(newUpdatedDate !== oldUpdatedDate).equal(true);

        await userAClient.mutate({
            mutation: RemovePackageFromCollectionDocument,
            variables: {
                collectionIdentifier: {
                    collectionSlug: "test-update-collection"
                },
                packageIdentifier: {
                    catalogSlug: "testA-collection",
                    packageSlug: "congressional-legislators"
                }
            }
        });
    });

    it("User B add package to collection", async function () {
        const response = await userBClient.mutate({
            mutation: AddPackageToCollectionDocument,
            variables: {
                collectionIdentifier: {
                    collectionSlug: "testB-collection"
                },
                packageIdentifier: {
                    catalogSlug: "testA-collection",
                    packageSlug: "congressional-legislators"
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);
        expect(response.data?.addPackageToCollection.collection.identifier.collectionSlug).equal("testB-collection");
        expect(response.data?.addPackageToCollection.package.identifier.catalogSlug).equal("testA-collection");
        expect(response.data?.addPackageToCollection.package.identifier.packageSlug).equal("congressional-legislators");
    });

    it("User A get testB-collection - fail no authorizaiton", async function () {
        const response = await userAClient.query({
            query: CollectionDocument,
            variables: {
                identifier: {
                    collectionSlug: "testB-collection"
                }
            }
        });

        if (response.errors == null) {
            throw new Error("Expected error");
        }

        expect(response.errors != null, "has errors").equal(true);
        expect(response.errors[0].message).equal("NOT_AUTHORIZED");
    });

    it("User A list user B collections - not present", async function () {
        const response = await userAClient.query({
            query: UserCollectionsDocument,
            variables: {
                username: "testB-collection",
                offSet: 0,
                limit: 10
            }
        });

        expect(response.errors == null, "has no errors").equal(true);
        expect(response.data.userCollections.hasMore).equal(false);
        expect(response.data.userCollections.count).equal(0);
        expect(response.data.userCollections.collections?.length).equal(0);
    });

    it("User B set collection public", async function () {
        const response = await userBClient.mutate({
            mutation: UpdateCollectionDocument,
            variables: {
                identifier: {
                    collectionSlug: "testB-collection"
                },
                value: {
                    newCollectionSlug: "new-collection-slug",
                    isPublic: true,
                    description: "new description",
                    name: "new name"
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);
        expect(response.data?.updateCollection.description).equal("new description");
        expect(response.data?.updateCollection.name).equal("new name");

        if (response.data?.updateCollection.packages == null) {
            throw new Error("Expected packages");
        }
        expect(response.data?.updateCollection.packages.length === 1).equal(true);
        expect(response.data?.updateCollection.identifier.collectionSlug).equal("new-collection-slug");
    });

    it("User A set collection public", async function () {
        const response = await userAClient.mutate({
            mutation: UpdateCollectionDocument,
            variables: {
                identifier: {
                    collectionSlug: "testA-collection"
                },
                value: {
                    isPublic: true
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);
        expect(response.data?.updateCollection.identifier.collectionSlug).equal("testA-collection");
        expect(response.data?.updateCollection.isPublic).equal(true);
    });

    it("User A get collection", async function () {
        const response = await userAClient.query({
            query: CollectionDocument,
            variables: {
                identifier: {
                    collectionSlug: "new-collection-slug"
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);
        expect(response.data?.collection.description).equal("new description");
        expect(response.data?.collection.name).equal("new name");

        if (response.data?.collection.packages == null) {
            throw new Error("Expected packages");
        }
        expect(response.data?.collection.packages.length === 1).equal(true);
        expect(response.data?.collection.identifier.collectionSlug).equal("new-collection-slug");
    });

    it("User A list user B collections - present", async function () {
        const response = await userAClient.query({
            query: UserCollectionsDocument,
            variables: {
                username: "testB-collection",
                offSet: 0,
                limit: 10
            }
        });

        expect(response.errors == null, "has no errors").equal(true);
        expect(response.data.userCollections.hasMore).equal(false);
        expect(response.data.userCollections.count).equal(1);
        expect(response.data.userCollections.collections?.length).equal(1);

        if (response.data.userCollections.collections == null) {
            throw new Error("Expected packages");
        }
        expect(response.data.userCollections.collections[0].identifier.collectionSlug).equal("new-collection-slug");
    });

    it("Adding at least three unique packages to a collection", async function () {
        const packageFileContents = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");
        const packageFileString = JSON.stringify(packageFileContents);
        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: "testA-collection",
                    packageSlug: "congressional-legislators-1",
                    displayName: "Congressional Legislators-1",
                    description: "Test upload of congressional legislators"
                }
            }
        });
        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: "testA-collection",
                    packageSlug: "congressional-legislators-2",
                    displayName: "Congressional Legislators-2",
                    description: "Test upload of congressional legislators"
                }
            }
        });
        await userAClient.mutate({
            mutation: CreateVersionDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-collection",
                    packageSlug: "congressional-legislators-1"
                },
                value: {
                    packageFile: packageFileString
                }
            }
        });
        await userAClient.mutate({
            mutation: CreateVersionDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-collection",
                    packageSlug: "congressional-legislators-2"
                },
                value: {
                    packageFile: packageFileString
                }
            }
        });
        await userAClient.mutate({
            mutation: AddPackageToCollectionDocument,
            variables: {
                collectionIdentifier: {
                    collectionSlug: "testA-collection"
                },
                packageIdentifier: {
                    catalogSlug: "testA-collection",
                    packageSlug: "congressional-legislators"
                }
            }
        });
        await userAClient.mutate({
            mutation: AddPackageToCollectionDocument,
            variables: {
                collectionIdentifier: {
                    collectionSlug: "testA-collection"
                },
                packageIdentifier: {
                    catalogSlug: "testA-collection",
                    packageSlug: "congressional-legislators-1"
                }
            }
        });
        await userAClient.mutate({
            mutation: AddPackageToCollectionDocument,
            variables: {
                collectionIdentifier: {
                    collectionSlug: "testA-collection"
                },
                packageIdentifier: {
                    catalogSlug: "testA-collection",
                    packageSlug: "congressional-legislators-2"
                }
            }
        });
        const response = await userAClient.query({
            query: CollectionPackagesDocument,
            variables: {
                identifier: {
                    collectionSlug: "testA-collection"
                },
                limit: 10,
                offset: 0
            }
        });
        expect(response.errors == null).equal(true);
        expect(response.data?.collectionPackages?.length).to.equal(3);
    });

    it("Package returns error if Version does not exist", async function () {
        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: "testA-collection",
                    packageSlug: "congressional-legislators-4",
                    displayName: "Congressional Legislators-4",
                    description: "Test upload of congressional legislators"
                }
            }
        });

        const response = await userAClient.mutate({
            mutation: AddPackageToCollectionDocument,
            variables: {
                collectionIdentifier: {
                    collectionSlug: "testA-collection"
                },
                packageIdentifier: {
                    catalogSlug: "testA-collection",
                    packageSlug: "congressional-legislators-4"
                }
            }
        });

        if (response.errors == null) {
            throw new Error("Expected error");
        }
        expect(response.errors[0].message).to.equal("PACKAGE_HAS_NO_VERSIONS");
    });

    it("Anonymous get collection", async function () {
        const response = await anonymousUser.query({
            query: CollectionDocument,
            variables: {
                identifier: {
                    collectionSlug: "new-collection-slug"
                }
            }
        });

        if (response.data?.collection.packages == null) {
            throw new Error("Expected packages");
        }
        expect(response.errors == null, "no errors").equal(true);
        expect(response.data?.collection.description).equal("new description");
        expect(response.data?.collection.name).equal("new name");
        expect(response.data?.collection.packages.length === 1).equal(true);
        expect(response.data?.collection.identifier.collectionSlug).equal("new-collection-slug");
    });

    it("Anonymous list user B collections - present", async function () {
        const response = await anonymousUser.query({
            query: UserCollectionsDocument,
            variables: {
                username: "testB-collection",
                offSet: 0,
                limit: 10
            }
        });

        expect(response.errors == null, "has no errors").equal(true);
        expect(response.data.userCollections.hasMore).equal(false);
        expect(response.data.userCollections.count).equal(1);
        expect(response.data.userCollections.collections?.length).equal(1);
    });

    it("Delete collection", async function () {
        const response = await userBClient.mutate({
            mutation: DeleteCollectionDocument,
            variables: {
                identifier: {
                    collectionSlug: "new-collection-slug"
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);
    });

    it("Get collection after delete", async function () {
        const response = await anonymousUser.query({
            query: CollectionDocument,
            variables: {
                identifier: {
                    collectionSlug: "new-collection-slug"
                }
            }
        });

        if (response.errors == null) {
            throw new Error("Expected error");
        }
        expect(response.errors != null, "has error").equal(true);
        expect(response.errors[0].message).equal("COLLECTION_NOT_FOUND");
    });
});
