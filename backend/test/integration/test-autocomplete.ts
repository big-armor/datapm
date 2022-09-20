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

    before(async () => {
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

        expect(userAClient).to.not.equal(undefined);
        expect(userBClient).to.not.equal(undefined);
        expect(userCClient).to.not.equal(undefined);
    });

    it("Creates inital packages and collections for search queries", async function () {
        const packageFileContents = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");
        const packageFileString = JSON.stringify(packageFileContents);

        const createCollection = await userAClient.mutate({
            mutation: CreateCollectionDocument,
            variables: {
                value: {
                    collectionSlug: "collection-auto-complete-test-v1",
                    name: "Collection Auto Complete Test v1 For Training",
                    description: "This is a test collection for auto-complete test purposes"
                }
            }
        });

        expect(createCollection.errors == null).equal(true);

        const createCatalog = await userAClient.mutate({
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

        expect(createCatalog.errors == null).equal(true);

        const createPackage = await userAClient.mutate({
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

        expect(createPackage.errors == null).equal(true);

        const addVersionToPackage = await userAClient.mutate({
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

        expect(addVersionToPackage.errors == null).equal(true);
    });

    it("Should return packages by slug", async function () {
        const response = await userAClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "package-au"
            }
        });

        if (response.data?.autoComplete?.packages == null) {
            throw new Error("No packages returned");
        }

        expect(response.data?.autoComplete?.packages?.length).to.equal(1);
        expect(response.data?.autoComplete?.packages[0].identifier.packageSlug).to.equal(
            "package-auto-complete-test-v1"
        );
    });

    it("Should return packages by reference", async function () {
        const response = await userAClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "catalog-auto-complete-test-v1/package-auto-complete-test-v1"
            }
        });

        if (response.data?.autoComplete?.packages == null) {
            throw new Error("No packages returned");
        }

        expect(response.data?.autoComplete?.packages?.length).to.equal(1);
        expect(response.data?.autoComplete?.packages[0].identifier.packageSlug).to.equal(
            "package-auto-complete-test-v1"
        );
    });

    it("Should return packages by display name", async function () {
        const response = await userAClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "Package Au"
            }
        });
        if (response.data?.autoComplete?.packages == null) {
            throw new Error("No packages returned");
        }

        expect(response.data?.autoComplete?.packages?.length).to.equal(1);
        expect(response.data?.autoComplete?.packages[0].displayName).to.equal(
            "Package Auto Complete Test v1 For Lucid"
        );
    });

    it("Should return catalogs by slug", async function () {
        const response = await userAClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "catalog-au"
            }
        });

        if (response.data?.autoComplete?.catalogs == null) {
            throw new Error("No catalogs returned");
        }

        expect(response.data?.autoComplete?.catalogs?.length).to.equal(1);
        expect(response.data?.autoComplete?.catalogs[0].identifier.catalogSlug).to.equal(
            "catalog-auto-complete-test-v1"
        );
    });

    it("Should return catalogs display name", async function () {
        const response = await userAClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "Catalog Au"
            }
        });

        if (response.data?.autoComplete?.catalogs == null) {
            throw new Error("No catalogs returned");
        }

        expect(response.data?.autoComplete?.catalogs?.length).to.equal(1);
        expect(response.data?.autoComplete?.catalogs[0].displayName).to.equal(
            "Catalog Auto Complete Test v1 For Exercise"
        );
    });

    it("Should return collections by slug", async function () {
        const response = await userAClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "collection-au"
            }
        });

        if (response.data?.autoComplete?.collections == null) {
            throw new Error("No collections returned");
        }

        expect(response.data?.autoComplete?.collections?.length).to.equal(1);
        expect(response.data?.autoComplete?.collections[0].identifier.collectionSlug).to.equal(
            "collection-auto-complete-test-v1"
        );
    });

    it("Should return collections by display name", async function () {
        const response = await userAClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "Collection Au"
            }
        });

        if (response.data?.autoComplete?.collections == null) {
            throw new Error("No collections returned");
        }

        expect(response.data?.autoComplete?.collections?.length).to.equal(1);
        expect(response.data?.autoComplete?.collections[0].name).to.equal(
            "Collection Auto Complete Test v1 For Training"
        );
    });

    it("Should return users by username", async function () {
        const setUserPublic = await userAClient.mutate({
            mutation: UpdateMeDocument,
            variables: {
                value: {
                    nameIsPublic: true
                }
            }
        });

        const response = await userAClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "userA"
            }
        });

        if (response.data?.autoComplete?.users == null) {
            throw new Error("No users returned");
        }

        expect(response.data?.autoComplete?.users?.length).to.equal(1);
        expect(response.data?.autoComplete?.users[0].username).to.equal("userA-auto-complete-test");
    });

    it("Should return users by first or last name", async function () {
        const firstName = await userAClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "AAut"
            }
        });
        const lastName = await userAClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "ACompl"
            }
        });

        if (firstName.data?.autoComplete?.users == null) {
            throw new Error("No users returned");
        }

        expect(firstName.data?.autoComplete?.users?.length).to.equal(1);
        expect(firstName.data?.autoComplete?.users[0].username).to.equal("userA-auto-complete-test");
        expect(lastName.data?.autoComplete?.users?.length).to.equal(1);
    });

    it("Should return users by email address", async function () {
        const setEmailPublic = await userAClient.mutate({
            mutation: UpdateMeDocument,
            variables: {
                value: {
                    emailAddressIsPublic: true
                }
            }
        });

        const response = await userAClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "Aemail"
            }
        });

        expect(response.data?.autoComplete?.users?.length).to.equal(1);
    });

    it("Should return users only if nameIsPublic", async function () {
        const setUserNotPublic = await userAClient.mutate({
            mutation: UpdateMeDocument,
            variables: {
                value: {
                    nameIsPublic: false
                }
            }
        });

        const response = await userAClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "AAut"
            }
        });

        expect(response.data?.autoComplete?.users?.length).to.equal(0);
    });

    it("Should return users only if emailAddressIsPublic", async function () {
        const setEmailNotPublic = await userAClient.mutate({
            mutation: UpdateMeDocument,
            variables: {
                value: {
                    emailAddressIsPublic: false
                }
            }
        });

        const after = await userAClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "Aemail"
            }
        });

        expect(after.data?.autoComplete?.users?.length).to.equal(0);
    });

    it("Should return empty for User B not public", async function () {
        const catalogToNotPublic = await userAClient.mutate({
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

        expect(catalogToNotPublic.errors).to.equal(undefined);

        const packages = await userBClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "package-auto-co"
            }
        });
        const collections = await userBClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "collection-auto-compl"
            }
        });
        const catalogs = await userBClient.query({
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
        const collectionToPublic = await userAClient.mutate({
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

        const catalogToPublic = await userAClient.mutate({
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

        const packageToPublic = await userAClient.mutate({
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

        const packages = await userCClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "package-auto-com"
            }
        });

        const collections = await userCClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "collection-auto-compl"
            }
        });

        const catalogs = await userCClient.query({
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
        const strangeChars = await userAClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "שלום ירושלים"
            }
        });

        const nonEnglish = await userAClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "hayır ve göster"
            }
        });

        expect(strangeChars.errors == null).to.equal(true);
        expect(nonEnglish.errors == null).to.equal(true);
    });

    it("Deletes Collection, Package, Catalog", async function () {
        const deleteCollection = await userAClient.mutate({
            mutation: DeleteCollectionDocument,
            variables: {
                identifier: {
                    collectionSlug: "collection-auto-complete-test-v1"
                }
            }
        });

        const deletePackage = await userAClient.mutate({
            mutation: DeletePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "catalog-auto-complete-test-v1",
                    packageSlug: "package-auto-complete-test-v1"
                }
            }
        });

        const deleteCatalog = await userAClient.mutate({
            mutation: DeleteCatalogDocument,
            variables: {
                identifier: {
                    catalogSlug: "catalog-auto-complete-test-v1"
                }
            }
        });

        expect(deleteCollection.errors == null).to.equal(true);
        expect(deletePackage.errors == null).to.equal(true);
        expect(deleteCatalog.errors == null).to.equal(true);
    });
});
