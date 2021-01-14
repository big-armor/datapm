import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";
import { expect } from "chai";
import {
    AutoCompleteDocument,
    CreateCollectionDocument,
    CreatePackageDocument,
    UpdateMeDocument,
    CreateCatalogDocument,
    UpdatePackageDocument,
    UpdateCatalogDocument,
    CreateVersionDocument,
    UpdateCollectionDocument,
    DeletePackageDocument,
    DeleteCatalogDocument,
    DeleteCollectionDocument
} from "./registry-client";
import { createUser } from "./test-utils";
import { describe, it } from "mocha";
import { loadPackageFileFromDisk } from "datapm-lib";

describe("Autocomplete tests", async () => {
    let userAClient: ApolloClient<NormalizedCacheObject>;
    let userBClient: ApolloClient<NormalizedCacheObject>;
    let userCClient: ApolloClient<NormalizedCacheObject>;

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

        userCClient = await createUser(
            "CAuta",
            "CCompletely",
            "userC-auto-complete-test",
            "Cemailautocomplete@test.datapm.io",
            "autoPassward3!"
        );

        expect(userAClient).to.exist;
        expect(userBClient).to.exist;
        expect(userCClient).to.exist;
    });

    it("Creates inital packages and collections for search queries", async function () {
        let packageFileContents = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");
        const packageFileString = JSON.stringify(packageFileContents);

        let createCollection = await userAClient.mutate({
            mutation: CreateCollectionDocument,
            variables: {
                value: {
                    collectionSlug: "collection-auto-complete-test-v1",
                    name: "Collection Auto Complete Test v1 For Training",
                    description: "This is a test collection for auto-complete test purposes"
                }
            }
        });

        let createCatalog = await userAClient.mutate({
            mutation: CreateCatalogDocument,
            variables: {
                value: {
                    slug: "catalog-auto-complete-test-v1",
                    displayName: "Catalog Auto Complete Test v1 For Exercise",
                    description: "This is a test catalog for auto-complete test purposes",
                    website: "https://autocomplete.datapm.io",
                    isPublic: true
                }
            }
        });

        let createPackage = await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: "catalog-auto-complete-test-v1",
                    packageSlug: "package-auto-complete-test-v1",
                    displayName: "Package Auto Complete Test v1 For Lucid",
                    description: "This is a test package for auto-complete test purposes"
                }
            }
        });

        let addVersionToPackage = await userAClient.mutate({
            mutation: CreateVersionDocument,
            variables: {
                identifier: {
                    catalogSlug: "catalog-auto-complete-test-v1",
                    packageSlug: "package-auto-complete-test-v1"
                },
                value: {
                    packageFile: packageFileString
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
        expect(response.data?.autoComplete?.packages![0].identifier.packageSlug).to.equal(
            "package-auto-complete-test-v1"
        );
    });

    it("Should return packages display name", async function () {
        let response = await userAClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "Package Au"
            }
        });

        expect(response.data?.autoComplete?.packages?.length).to.equal(1);
        expect(response.data?.autoComplete?.packages![0].displayName).to.equal(
            "Package Auto Complete Test v1 For Lucid"
        );
    });

    it("Should return catalogs by slug", async function () {
        let response = await userAClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "catalog-au"
            }
        });

        expect(response.data?.autoComplete?.catalogs?.length).to.equal(1);
        expect(response.data?.autoComplete?.catalogs![0].identifier.catalogSlug).to.equal(
            "catalog-auto-complete-test-v1"
        );
    });

    it("Should return catalogs display name", async function () {
        let response = await userAClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "Catalog Au"
            }
        });

        expect(response.data?.autoComplete?.catalogs?.length).to.equal(1);
        expect(response.data?.autoComplete?.catalogs![0].displayName).to.equal(
            "Catalog Auto Complete Test v1 For Exercise"
        );
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
        expect(response.data?.autoComplete?.collections![0].name).to.equal(
            "Collection Auto Complete Test v1 For Training"
        );
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
        let setEmailPublic = await userAClient.mutate({
            mutation: UpdateMeDocument,
            variables: {
                value: {
                    emailAddressIsPublic: true
                }
            }
        });

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
        let setEmailNotPublic = await userAClient.mutate({
            mutation: UpdateMeDocument,
            variables: {
                value: {
                    emailAddressIsPublic: false
                }
            }
        });

        let after = await userAClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "Aemail"
            }
        });

        expect(after.data?.autoComplete?.users?.length).to.equal(0);
    });

    it("Should return empty for User B not public", async function () {
        let catalogToNotPublic = await userAClient.mutate({
            mutation: UpdateCatalogDocument,
            variables: {
                identifier: {
                    catalogSlug: "catalog-auto-complete-test-v1"
                },
                value: {
                    isPublic: false
                }
            }
        });

        let packages = await userBClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "package-auto-co"
            }
        });
        let collections = await userBClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "collection-auto-compl"
            }
        });
        let catalogs = await userBClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "catalog-auto-compl"
            }
        });

        expect(packages.data?.autoComplete?.packages?.length).to.equal(0);
        expect(collections.data?.autoComplete?.collections?.length).to.equal(0);
        expect(catalogs.data?.autoComplete?.catalogs?.length).to.equal(0);
    });

    it("Should return nodes for User C setting to public", async function () {
        let collectionToPublic = await userAClient.mutate({
            mutation: UpdateCollectionDocument,
            variables: {
                identifier: {
                    collectionSlug: "collection-auto-complete-test-v1"
                },
                value: {
                    isPublic: true
                }
            }
        });

        let catalogToPublic = await userAClient.mutate({
            mutation: UpdateCatalogDocument,
            variables: {
                identifier: {
                    catalogSlug: "catalog-auto-complete-test-v1"
                },
                value: {
                    isPublic: true
                }
            }
        });

        let packageToPublic = await userAClient.mutate({
            mutation: UpdatePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "catalog-auto-complete-test-v1",
                    packageSlug: "package-auto-complete-test-v1"
                },
                value: {
                    isPublic: true
                }
            }
        });

        let packages = await userCClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "package-auto-com"
            }
        });

        let collections = await userCClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "collection-auto-compl"
            }
        });

        let catalogs = await userCClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "catalog-auto-comple"
            }
        });

        expect(packages.data?.autoComplete?.packages?.length).to.equal(1);
        expect(collections.data?.autoComplete?.collections?.length).to.equal(1);
        expect(catalogs.data?.autoComplete?.catalogs?.length).to.equal(1);
    });

    it("Test i18n strings", async function () {
        let strangeChars = await userAClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "שלום ירושלים"
            }
        });

        let nonEnglish = await userAClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "hayır ve göster"
            }
        });

        expect(strangeChars.errors! == null).to.equal(true);
        expect(nonEnglish.errors! == null).to.equal(true);
    });

    it("Deletes Collection, Package, Catalog", async function () {
        let deleteCollection = await userAClient.mutate({
            mutation: DeleteCollectionDocument,
            variables: {
                identifier: {
                    collectionSlug: "collection-auto-complete-test-v1"
                }
            }
        });

        let deletePackage = await userAClient.mutate({
            mutation: DeletePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "catalog-auto-complete-test-v1",
                    packageSlug: "package-auto-complete-test-v1"
                }
            }
        });

        let deleteCatalog = await userAClient.mutate({
            mutation: DeleteCatalogDocument,
            variables: {
                identifier: {
                    catalogSlug: "catalog-auto-complete-test-v1"
                }
            }
        });

        expect(deleteCollection.errors! == null).to.equal(true);
        expect(deletePackage.errors! == null).to.equal(true);
        expect(deleteCatalog.errors! == null).to.equal(true);
    });
});
