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
    SearchCollectionsDocument,
    DeleteCollectionDocument,
    CreateVersionDocument
} from "./registry-client";
import { createAnonymousClient, createUser } from "./test-utils";
import { describe, it } from "mocha";
import { loadPackageFileFromDisk } from "datapm-lib";

describe("Collection Search Tests", async () => {
    let userAClient: ApolloClient<NormalizedCacheObject>;
    let userBClient: ApolloClient<NormalizedCacheObject>;
    const anonymousUser = createAnonymousClient();

    before(async () => {
        userAClient = await createUser(
            "FirstA",
            "LastA",
            "testA-collection-search",
            "testA-collection-search@test.datapm.io",
            "passwordA!"
        );
        userBClient = await createUser(
            "FirstB",
            "LastB",
            "testB-collection-search",
            "testB-collection-search@test.datapm.io",
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
                    catalogSlug: "testA-collection-search",
                    packageSlug: "congressional-legislators",
                    displayName: "Congressional Legislators",
                    description: "Test upload of congressional legislators"
                }
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
        expect(response.data?.createPackage.catalog?.displayName).to.equal("testA-collection-search");
        expect(response.data?.createPackage.description).to.equal("Test upload of congressional legislators");
        expect(response.data?.createPackage.displayName).to.equal("Congressional Legislators");
        expect(response.data?.createPackage.identifier.catalogSlug).to.equal("testA-collection-search");
        expect(response.data?.createPackage.identifier.packageSlug).to.equal("congressional-legislators");
        expect(response.data?.createPackage.latestVersion).to.equal(null);
    });

    it("User A update catalog to be public", async function () {
        const response = await userAClient.mutate({
            mutation: UpdateCatalogDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-collection-search"
                },
                value: {
                    isPublic: true
                }
            }
        });

        expect(response.errors == null).equal(true);
    });

    it("User A publish first version", async function () {
        const packageFileContents = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");

        const packageFileString = JSON.stringify(packageFileContents);

        const response = await userAClient.mutate({
            mutation: CreateVersionDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-collection-search",
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
                    catalogSlug: "testA-collection-search",
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
                    catalogSlug: "testA-collection-search"
                },
                value: {
                    isPublic: true
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);
    });

    it("User B create a collection", async function () {
        const response = await userBClient.mutate({
            mutation: CreateCollectionDocument,
            variables: {
                value: {
                    collectionSlug: "testB-collection-search",
                    name: "Congressional Data Sets",
                    description: "Short test for congressional data sets"
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);
        expect(response.data?.createCollection.creator?.username).equal("testB-collection-search");
        expect(response.data?.createCollection.identifier.collectionSlug).equal("testB-collection-search");
        expect(response.data?.createCollection.name).equal("Congressional Data Sets");
        expect(response.data?.createCollection.description).equal("Short test for congressional data sets");
    });

    it("User B add package to collection", async function () {
        const response = await userBClient.mutate({
            mutation: AddPackageToCollectionDocument,
            variables: {
                collectionIdentifier: {
                    collectionSlug: "testB-collection-search"
                },
                packageIdentifier: {
                    catalogSlug: "testA-collection-search",
                    packageSlug: "congressional-legislators"
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);
        expect(response.data?.addPackageToCollection.collection.identifier.collectionSlug).equal(
            "testB-collection-search"
        );
        expect(response.data?.addPackageToCollection.package.identifier.catalogSlug).equal("testA-collection-search");
        expect(response.data?.addPackageToCollection.package.identifier.packageSlug).equal("congressional-legislators");
    });

    it("Anonymous User search collection - fail becuase it's not public", async function () {
        const response = await anonymousUser.query({
            query: SearchCollectionsDocument,
            variables: {
                limit: 10,
                offset: 0,
                query: "congressional"
            }
        });

        expect(response.errors == null, "no errors").equal(true);
        expect(response.data?.searchCollections.count).equal(0);
        expect(response.data?.searchCollections.collections?.length).equal(0);
    });

    it("User B set collection public", async function () {
        const response = await userBClient.mutate({
            mutation: UpdateCollectionDocument,
            variables: {
                identifier: {
                    collectionSlug: "testB-collection-search"
                },
                value: {
                    isPublic: true
                }
            }
        });
        expect(response.errors == null, "no errors").equal(true);
    });

    it("Anonymous get collection", async function () {
        const response = await anonymousUser.query({
            query: CollectionDocument,
            variables: {
                identifier: {
                    collectionSlug: "testB-collection-search"
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);
        expect(response.data?.collection.creator?.username).equal("testB-collection-search");
        expect(response.data?.collection.identifier.collectionSlug).equal("testB-collection-search");
        expect(response.data?.collection.name).equal("Congressional Data Sets");
        expect(response.data?.collection.description).equal("Short test for congressional data sets");
    });

    it("Anonymous User search collection", async function () {
        const response = await anonymousUser.query({
            query: SearchCollectionsDocument,
            variables: {
                limit: 10,
                offset: 0,
                query: "congressional"
            }
        });

        const targetPackage = response.data?.searchCollections.collections?.find(
            (p) => p.identifier.collectionSlug === "testB-collection-search"
        );
        expect(targetPackage != null, "package returned").equal(true);
        expect(targetPackage?.name).to.equal("Congressional Data Sets");
    });

    it("Delete collection", async function () {
        const response = await userBClient.mutate({
            mutation: DeleteCollectionDocument,
            variables: {
                identifier: {
                    collectionSlug: "testB-collection-search"
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);
    });

    it("Anonymous User search collection - fail becuase it was deleted", async function () {
        const response = await anonymousUser.query({
            query: SearchCollectionsDocument,
            variables: {
                limit: 10,
                offset: 0,
                query: "congressional"
            }
        });

        expect(response.errors == null, "no errors").equal(true);
        expect(response.data?.searchCollections.count).equal(0);
        expect(response.data?.searchCollections.collections?.length).equal(0);
    });
});
