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
    DisableCollectionDocument
} from "./registry-client";
import { createAnonymousClient, createUser } from "./test-utils";
import { describe, it } from "mocha";

describe("Collection Search Tests", async () => {
    let userAClient: ApolloClient<NormalizedCacheObject>;
    let userBClient: ApolloClient<NormalizedCacheObject>;
    let anonymousUser = createAnonymousClient();

    before(async () => {});

    it("Create users A & B", async function () {
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
        expect(userAClient).to.exist;
        expect(userBClient).to.exist;
    });

    it("Should allow user to create a package", async function () {
        let response = await userAClient.mutate({
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
        expect(response.data!.createPackage.catalog.displayName).to.equal("testA-collection-search");
        expect(response.data!.createPackage.description).to.equal("Test upload of congressional legislators");
        expect(response.data!.createPackage.displayName).to.equal("Congressional Legislators");
        expect(response.data!.createPackage.identifier.catalogSlug).to.equal("testA-collection-search");
        expect(response.data!.createPackage.identifier.packageSlug).to.equal("congressional-legislators");
        expect(response.data!.createPackage.latestVersion).to.equal(null);
    });

    it("User A make package public", async function () {
        let response = await userAClient.mutate({
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

        expect(response.errors == null, "no errors").true;
    });

    it("User B create a collection", async function () {
        let response = await userBClient.mutate({
            mutation: CreateCollectionDocument,
            variables: {
                value: {
                    collectionSlug: "testB-collection-search",
                    name: "Congressional Data Sets",
                    description: "Short test for congressional data sets"
                }
            }
        });

        expect(response.errors == null, "no errors").true;
        expect(response.data!.createCollection.creator.username).equal("testB-collection-search");
        expect(response.data!.createCollection.identifier.collectionSlug).equal("testB-collection-search");
        expect(response.data!.createCollection.name).equal("Congressional Data Sets");
        expect(response.data!.createCollection.description).equal("Short test for congressional data sets");
    });

    it("User B add package to collection", async function () {
        let response = await userBClient.mutate({
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

        expect(response.errors == null, "no errors").true;
        expect(response.data!.addPackageToCollection.collection.identifier.collectionSlug).equal(
            "testB-collection-search"
        );
        expect(response.data!.addPackageToCollection.package.identifier.catalogSlug).equal("testA-collection-search");
        expect(response.data!.addPackageToCollection.package.identifier.packageSlug).equal("congressional-legislators");
    });

    it("Anonymous User search collection - fail becuase it's not public", async function () {
        let response = await anonymousUser.query({
            query: SearchCollectionsDocument,
            variables: {
                limit: 10,
                offset: 0,
                query: "congressional"
            }
        });

        expect(response.errors == null, "no errors").true;
        expect(response.data!.searchCollections.count).equal(0);
        expect(response.data!.searchCollections.collections!.length).equal(0);
    });

    it("User B set collection public", async function () {
        let response = await userBClient.mutate({
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
        expect(response.errors == null, "no errors").true;
    });

    it("Anonymous get collection", async function () {
        let response = await anonymousUser.query({
            query: CollectionDocument,
            variables: {
                identifier: {
                    collectionSlug: "testB-collection-search"
                }
            }
        });

        expect(response.errors == null, "no errors").true;
        expect(response.data!.collection.creator.username).equal("testB-collection-search");
        expect(response.data!.collection.identifier.collectionSlug).equal("testB-collection-search");
        expect(response.data!.collection.name).equal("Congressional Data Sets");
        expect(response.data!.collection.description).equal("Short test for congressional data sets");
    });

    it("Anonymous User search collection", async function () {
        let response = await anonymousUser.query({
            query: SearchCollectionsDocument,
            variables: {
                limit: 10,
                offset: 0,
                query: "congressional"
            }
        });

        let targetPackage = response.data!.searchCollections.collections!.find(
            (p) => p.identifier.collectionSlug == "testB-collection-search"
        );
        expect(targetPackage != null, "package returned").true;
        expect(targetPackage!.name).to.equal("Congressional Data Sets");
    });

    it("Delete collection", async function () {
        let response = await userBClient.mutate({
            mutation: DisableCollectionDocument,
            variables: {
                identifier: {
                    collectionSlug: "testB-collection-search"
                }
            }
        });

        expect(response.errors == null, "no errors").true;
    });

    it("Anonymous User search collection - fail becuase it was deleted", async function () {
        let response = await anonymousUser.query({
            query: SearchCollectionsDocument,
            variables: {
                limit: 10,
                offset: 0,
                query: "congressional"
            }
        });

        expect(response.errors == null, "no errors").true;
        expect(response.data!.searchCollections.count).equal(0);
        expect(response.data!.searchCollections.collections!.length).equal(0);
    });
});
