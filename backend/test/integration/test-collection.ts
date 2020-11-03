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
    DisableCollectionDocument
} from "./registry-client";
import { createAnonymousClient, createUser } from "./test-utils";
import { describe, it } from "mocha";

describe("Collection Tests", async () => {
    let userAClient: ApolloClient<NormalizedCacheObject>;
    let userBClient: ApolloClient<NormalizedCacheObject>;
    let anonymousUser = createAnonymousClient();

    before(async () => {});

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
        expect(userAClient).to.exist;
        expect(userBClient).to.exist;
    });

    it("Should allow user to create a package", async function () {
        let response = await userAClient.mutate({
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
        expect(response.data!.createPackage.catalog.displayName).to.equal("testA-collection");
        expect(response.data!.createPackage.description).to.equal("Test upload of congressional legislators");
        expect(response.data!.createPackage.displayName).to.equal("Congressional Legislators");
        expect(response.data!.createPackage.identifier.catalogSlug).to.equal("testA-collection");
        expect(response.data!.createPackage.identifier.packageSlug).to.equal("congressional-legislators");
        expect(response.data!.createPackage.latestVersion).to.equal(null);
    });

    it("Get collection that does not exist", async function () {
        let response = await anonymousUser.query({
            query: CollectionDocument,
            variables: {
                identifier: {
                    collectionSlug: "some-collection"
                }
            }
        });

        expect(response.errors != null, "has error").true;
        expect(response.errors![0].message).equal("COLLECTION_NOT_FOUND");
    });

    it("Create Collection with invalid slug", async function () {
        let errorFound = false;
        let response = await userBClient
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
                let fetchResult = error.networkError as ServerError;
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
        let response = await userBClient.mutate({
            mutation: CreateCollectionDocument,
            variables: {
                value: {
                    collectionSlug: "testB-collection",
                    name: "test b collection",
                    description: "Short test"
                }
            }
        });

        expect(response.errors == null, "no errors").true;
        expect(response.data!.createCollection.creator.username).equal("testB-collection");
        expect(response.data!.createCollection.identifier.collectionSlug).equal("testB-collection");
        expect(response.data!.createCollection.name).equal("test b collection");
        expect(response.data!.createCollection.description).equal("Short test");
    });

    it("User B create a collection - slug collision", async function () {
        let response = await userBClient.mutate({
            mutation: CreateCollectionDocument,
            variables: {
                value: {
                    collectionSlug: "testB-collection",
                    name: "test b collection",
                    description: "Short test"
                }
            }
        });

        expect(response.errors != null, "has errors").true;
        expect(response.errors![0].message).equal("COLLECTION_SLUG_NOT_AVAILABLE");
    });

    it("User B add package to collection - fail for permissions", async function () {
        let response = await userBClient.mutate({
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

        expect(response.errors != null, "has errors").true;
        expect(response.errors![0].message).equal("NOT_AUTHORIZED");
    });

    it("User A make package public", async function () {
        let response = await userAClient.mutate({
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

        expect(response.errors == null, "no errors").true;
    });

    it("User A make catalog public", async function () {
        let response = await userAClient.mutate({
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

        expect(response.errors == null, "no errors").true;
    });

    it("User B add package to collection", async function () {
        let response = await userBClient.mutate({
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

        expect(response.errors == null, "no errors").true;
        expect(response.data!.addPackageToCollection.collection.identifier.collectionSlug).equal("testB-collection");
        expect(response.data!.addPackageToCollection.package.identifier.catalogSlug).equal("testA-collection");
        expect(response.data!.addPackageToCollection.package.identifier.packageSlug).equal("congressional-legislators");
    });

    it("User A get testB-collection - fail no authorizaiton", async function () {
        let response = await userAClient.query({
            query: CollectionDocument,
            variables: {
                identifier: {
                    collectionSlug: "testB-collection"
                }
            }
        });

        expect(response.errors != null, "has errors").true;
        expect(response.errors![0].message).equal("NOT_AUTHORIZED");
    });

    it("User B set collection public", async function () {
        let response = await userBClient.mutate({
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
        expect(response.errors == null, "no errors").true;
        expect(response.data!.updateCollection.description).equal("new description");
        expect(response.data!.updateCollection.name).equal("new name");
        expect(response.data!.updateCollection.packages!.length == 1).true;
        expect(response.data!.updateCollection.identifier.collectionSlug).equal("new-collection-slug");
    });

    it("User A get collection", async function () {
        let response = await userAClient.query({
            query: CollectionDocument,
            variables: {
                identifier: {
                    collectionSlug: "new-collection-slug"
                }
            }
        });

        expect(response.errors == null, "no errors").true;
        expect(response.data!.collection.description).equal("new description");
        expect(response.data!.collection.name).equal("new name");
        expect(response.data!.collection.packages!.length == 1).true;
        expect(response.data!.collection.identifier.collectionSlug).equal("new-collection-slug");
    });

    it("Anonymous get collection", async function () {
        let response = await anonymousUser.query({
            query: CollectionDocument,
            variables: {
                identifier: {
                    collectionSlug: "new-collection-slug"
                }
            }
        });

        expect(response.errors == null, "no errors").true;
        expect(response.data!.collection.description).equal("new description");
        expect(response.data!.collection.name).equal("new name");
        expect(response.data!.collection.packages!.length == 1).true;
        expect(response.data!.collection.identifier.collectionSlug).equal("new-collection-slug");
    });

    it("Delete collection", async function () {
        let response = await userBClient.mutate({
            mutation: DisableCollectionDocument,
            variables: {
                identifier: {
                    collectionSlug: "new-collection-slug"
                }
            }
        });

        expect(response.errors == null, "no errors").true;
    });

    it("Get collection after delete", async function () {
        let response = await anonymousUser.query({
            query: CollectionDocument,
            variables: {
                identifier: {
                    collectionSlug: "new-collection-slug"
                }
            }
        });

        expect(response.errors != null, "has error").true;
        expect(response.errors![0].message).equal("COLLECTION_NOT_FOUND");
    });
});
