import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";
import { expect } from "chai";
import {
    AutoCompleteDocument,
    CreateCollectionDocument,
    CreatePackageDocument,
    UpdateMeDocument,
    MeDocument,
    UpdatePackageDocument,
    CreateCatalogDocument
} from "./registry-client";
import { createUser } from "./test-utils";
import { describe, it } from "mocha";

describe("Autocomplete tests", async () => {
    let userAClient: ApolloClient<NormalizedCacheObject>;
    let userBClient: ApolloClient<NormalizedCacheObject>;

    before(async () => {});

    it("Create users A & B", async function () {
        userAClient = await createUser(
            "AAuto",
            "ACompletely",
            "userA-auto-complete-test",
            "Aemailautocomplete@test.datapm.io",
            "autoPassword1!"
        );
        userBClient = await createUser(
            "BAuta",
            "BCompletely",
            "userB-auto-complete-test",
            "Bemailautocomplete@test.datapm.io",
            "autoPassward2!"
        );

        expect(userAClient).to.exist;
        expect(userBClient).to.exist;
    });

    it("Creates inital packages and collections for search queries", async function () {
        let createCollection = await userAClient.mutate({
            mutation: CreateCollectionDocument,
            variables: {
                value: {
                    collectionSlug: "collection-auto-complete-test-v1",
                    name: "Collection Auto Complete Test v1",
                    description: "This is a test collection for auto-complete test purposes"
                }
            }
        });

        let createCatalog = await userAClient.mutate({
            mutation: CreateCatalogDocument,
            variables: {
                value: {
                    slug: "catalog-auto-complete-v1",
                    displayName: "Catalog Auto Complete Test v1",
                    description: "This is a test catalog for auto-complete test purposes",
                    website: "https://autocomplete.datapm.io",
                    isPublic: false
                }
            }
        });

        let createPackage = await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: "userA-auto-complete-test",
                    packageSlug: "package-auto-complete-v1",
                    displayName: "Package Auto Complete Test v1",
                    description: "This is a test package for auto-complete test purposes"
                }
            }
        });

        expect(createCollection.errors! == null);
        expect(createCatalog.errors! == null);
        expect(createPackage.errors! == null);
    });

    it("Should return packages by slug", async function () {
        let response = await userAClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "package-au"
            }
        });

        expect(response.data?.autoComplete?.packages?.length).to.equal(1);
        expect(response.data?.autoComplete?.packages![0].identifier.packageSlug).to.equal("package-auto-complete-v1");
    });

    it("Should return packages display name", async function () {
        let response = await userAClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "Package Au"
            }
        });

        expect(response.data?.autoComplete?.packages?.length).to.equal(1);
        expect(response.data?.autoComplete?.packages![0].displayName).to.equal("Package Auto Complete Test v1");
    });

    it("Should return catalogs by slug", async function () {
        let response = await userAClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "catalog-au"
            }
        });

        expect(response.data?.autoComplete?.catalogs?.length).to.equal(1);
        expect(response.data?.autoComplete?.catalogs![0].identifier.catalogSlug).to.equal("catalog-auto-complete-v1");
    });

    it("Should return catalogs display name", async function () {
        let response = await userAClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "Catalog Au"
            }
        });

        expect(response.data?.autoComplete?.catalogs?.length).to.equal(1);
        expect(response.data?.autoComplete?.catalogs![0].displayName).to.equal("Catalog Auto Complete Test v1");
    });

    it("Should return collections by slug", async function () {
        let response = await userAClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "collection-au"
            }
        });

        expect(response.data?.autoComplete?.collections?.length).to.equal(1);
        expect(response.data?.autoComplete?.collections![0].identifier.collectionSlug).to.equal(
            "collection-auto-complete-test-v1"
        );
    });

    it("Should return collections by display name", async function () {
        let response = await userAClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "Collection Au"
            }
        });

        expect(response.data?.autoComplete?.collections?.length).to.equal(1);
        expect(response.data?.autoComplete?.collections![0].name).to.equal("Collection Auto Complete Test v1");
    });

    it("Should return users by username", async function () {
        let setUserPublic = await userAClient.mutate({
            mutation: UpdateMeDocument,
            variables: {
                value: {
                    nameIsPublic: true
                }
            }
        });

        let response = await userAClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "userA"
            }
        });

        expect(response.data?.autoComplete?.users?.length).to.equal(1);
        expect(response.data?.autoComplete?.users![0].username).to.equal("userA-auto-complete-test");
    });

    it("Should return users by first or last name", async function () {
        let firstName = await userAClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "AAut"
            }
        });
        let lastName = await userAClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "ACompl"
            }
        });

        expect(firstName.data?.autoComplete?.users?.length).to.equal(1);
        expect(firstName.data?.autoComplete?.users![0].username).to.equal("userA-auto-complete-test");
        expect(lastName.data?.autoComplete?.users?.length).to.equal(1);
        expect(lastName.data?.autoComplete?.users![0].emailAddress).to.equal("Aemailautocomplete@test.datapm.io");
    });

    it("Should return users by email address", async function () {
        let response = await userAClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "Aemail"
            }
        });

        expect(response.data?.autoComplete?.users?.length).to.equal(1);
        expect(response.data?.autoComplete?.users![0].emailAddress).to.equal("Aemailautocomplete@test.datapm.io");
    });

    it("Should return users only if nameIsPublic", async function () {
        let setUserNotPublic = await userAClient.mutate({
            mutation: UpdateMeDocument,
            variables: {
                value: {
                    nameIsPublic: false
                }
            }
        });

        let response = await userAClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "AAut"
            }
        });

        expect(response.data?.autoComplete?.users?.length).to.equal(0);
    });

    it("Should return users only if emailAddressIsPublic", async function () {
        let before = await userAClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "Aemail"
            }
        });

        let setEmailPublic = await userAClient.mutate({
            mutation: UpdateMeDocument,
            variables: {
                value: {
                    emailAddressIsPublic: true
                }
            }
        });

        let after = await userAClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "Aemail"
            }
        });

        expect(before.data?.autoComplete?.users?.length).to.equal(0);
        expect(after.data?.autoComplete?.users?.length).to.equal(1);
    });

    it("Should return packages by description vectors", async function () {});

    it("Should return packages readme vectors", async function () {});

    it("Should return collections description vectors", async function () {});

    it("Should return collections name tokens", async function () {});

    it("Should return catalogs displayName tokens", async function () {});

    it("Should return collections description_tokens tokens", async function () {});
});
