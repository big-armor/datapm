import { ApolloClient, NormalizedCacheObject, ServerError } from "@apollo/client/core";
import { ErrorResponse } from "apollo-link-error";
import { expect } from "chai";
import {
    DisableCatalogDocument,
    UpdateCatalogDocument,
    MyCatalogsDocument,
    MyCatalogsQuery,
    MyCatalogsQueryVariables,
    CreateCatalogDocument,
    GetCatalogDocument
} from "./registry-client";
import { createAnonymousClient, createUser } from "./test-utils";
import { describe, it } from "mocha";

describe("Catalog Tests", async () => {
    let userAClient: ApolloClient<NormalizedCacheObject>;
    let userBClient: ApolloClient<NormalizedCacheObject>;

    before(async () => {});

    it("Create users A & B", async function () {
        userAClient = await createUser(
            "FirstA",
            "LastA",
            "testA-catalog",
            "testA-catalog@test.datapm.io",
            "passwordA!"
        );
        userBClient = await createUser(
            "FirstB",
            "LastB",
            "testB-catalog",
            "testB-catalog@test.datapm.io",
            "passwordB!"
        );
        expect(userAClient).to.exist;
        expect(userBClient).to.exist;
    });

    it("MyCatalog for user A", async function () {
        return userAClient
            .query<MyCatalogsQuery, MyCatalogsQueryVariables>({
                query: MyCatalogsDocument
            })
            .catch((error) => {
                console.error(error);
                expect(true, "getting user catalogs failed").equal(false);
            })
            .then((value) => {
                expect(value).to.exist;

                if (value) {
                    let catalogs = value!.data.myCatalogs;

                    expect(catalogs.length).equal(1);

                    expect(catalogs[0]!.identifier.catalogSlug == "testA-catalog");
                    expect(catalogs[0]!.isPublic).equal(false);
                } else {
                    expect(true, "value to exist").equal(false);
                }
            });
    });

    it("MyCatalog for user B", async function () {
        return userBClient
            .query<MyCatalogsQuery, MyCatalogsQueryVariables>({
                query: MyCatalogsDocument
            })
            .catch((error) => {
                console.error(error);
                expect(true, "getting user catalogs failed").equal(false);
            })
            .then((value) => {
                expect(value).to.exist;

                if (value) {
                    let catalogs = value!.data.myCatalogs;

                    expect(catalogs.length).equal(1);

                    expect(catalogs[0]!.identifier.catalogSlug == "testB-catalog");
                    expect(catalogs[0]!.isPublic).equal(false);
                } else {
                    expect(true, "value to exist").equal(false);
                }
            });
    });

    it("Catalog that does not yet exist - should fail", async function () {
        let response = await userBClient.query({
            query: GetCatalogDocument,
            variables: {
                identifier: {
                    catalogSlug: "user-a-second-catalog"
                }
            }
        });

        expect(response.errors != null, "error should be returned").to.equal(true);
        expect(
            response.errors!.find((e) => e.message == "CATALOG_NOT_FOUND") != null,
            "should have invalid login error"
        ).equal(true);
    });

    it("User A Create Second Catalog - slug too short", async function () {
        let errorFound = false;
        await userAClient
            .mutate({
                mutation: CreateCatalogDocument,
                variables: {
                    value: {
                        slug: "",
                        displayName: "User A Second Catalog",
                        description: "This is an integration test User A second catalog",
                        website: "https://usera.datapm.io",
                        isPublic: false
                    }
                }
            })
            .catch((error: ErrorResponse) => {
                let fetchResult = error.networkError as ServerError;
                if (
                    fetchResult.result.errors.find(
                        (e: { extensions: { exception: { stacktrace: string[] } } }) =>
                            e.extensions.exception.stacktrace.find(
                                (s) => s == "ValidationError: CATALOG_SLUG_REQUIRED"
                            ) != null
                    ) != null
                )
                    errorFound = true;
            })
            .then((client) => {
                expect(errorFound, "catalog slug required error returned").equal(true);
            });
    });

    it("User A Create Second Catalog - slug invalid", async function () {
        let errorFound = false;
        await userAClient
            .mutate({
                mutation: CreateCatalogDocument,
                variables: {
                    value: {
                        slug: "-asdfasdf-asf",
                        displayName: "User A Second Catalog",
                        description: "This is an integration test User A second catalog",
                        website: "https://usera.datapm.io",
                        isPublic: false
                    }
                }
            })
            .catch((error: ErrorResponse) => {
                let fetchResult = error.networkError as ServerError;
                if (
                    fetchResult.result.errors.find(
                        (e: { extensions: { exception: { stacktrace: string[] } } }) =>
                            e.extensions.exception.stacktrace.find(
                                (s) => s == "ValidationError: CATALOG_SLUG_INVALID"
                            ) != null
                    ) != null
                )
                    errorFound = true;
            })
            .then((client) => {
                expect(errorFound, "catalog slug invalid error returned").equal(true);
            });
    });

    it("User A Create Second Catalog - slug too long", async function () {
        let errorFound = false;
        await userAClient
            .mutate({
                mutation: CreateCatalogDocument,
                variables: {
                    value: {
                        slug: "abcdefghijklmnopqrstuvwxyzabcdefghijklm",
                        displayName: "User A Second Catalog",
                        description: "This is an integration test User A second catalog",
                        website: "https://usera.datapm.io",
                        isPublic: false
                    }
                }
            })
            .catch((error: ErrorResponse) => {
                let fetchResult = error.networkError as ServerError;
                if (
                    fetchResult.result.errors.find(
                        (e: { extensions: { exception: { stacktrace: string[] } } }) =>
                            e.extensions.exception.stacktrace.find(
                                (s) => s == "ValidationError: CATALOG_SLUG_TOO_LONG"
                            ) != null
                    ) != null
                )
                    errorFound = true;
            })
            .then((client) => {
                expect(errorFound, "catalog slug too long error returned").equal(true);
            });
    });

    it("User A Create Second Catalog", async function () {
        let response = await userAClient.mutate({
            mutation: CreateCatalogDocument,
            variables: {
                value: {
                    slug: "user-a-second-catalog",
                    displayName: "User A Second Catalog",
                    description: "This is an integration test User A second catalog",
                    website: "https://usera.datapm.io",
                    isPublic: false
                }
            }
        });

        expect(response.errors! == null, "no errors returned").to.equal(true);

        expect(response.data!.createCatalog.description, "correct description").to.equal(
            "This is an integration test User A second catalog"
        );
        expect(response.data!.createCatalog.identifier.catalogSlug, "correct slug").to.equal("user-a-second-catalog");
        expect(response.data!.createCatalog.displayName, "correct displayName").to.equal("User A Second Catalog");
        expect(response.data!.createCatalog.website, "correct website").to.equal("https://usera.datapm.io");
        expect(response.data!.createCatalog.isPublic, "not public").to.equal(false);
    });

    it("User A Get Second Catalog", async function () {
        let response = await userAClient.query({
            query: GetCatalogDocument,
            variables: {
                identifier: {
                    catalogSlug: "user-a-second-catalog"
                }
            }
        });

        expect(response.errors == null, "no errors returned").to.equal(true);

        expect(response.data!.catalog.description, "correct description").to.equal(
            "This is an integration test User A second catalog"
        );
        expect(response.data!.catalog.identifier.catalogSlug, "correct slug").to.equal("user-a-second-catalog");
        expect(response.data!.catalog.displayName, "correct displayName").to.equal("User A Second Catalog");
        expect(response.data!.catalog.website, "correct website").to.equal("https://usera.datapm.io");
    });

    it("User B Get User A private catalog - should fail", async function () {
        let response = await userBClient.query({
            query: GetCatalogDocument,
            variables: {
                identifier: {
                    catalogSlug: "user-a-second-catalog"
                }
            }
        });

        expect(response.errors != null, "error should be returned").to.equal(true);
        expect(
            response.errors!.find((e) => e.message == "NOT_AUTHORIZED") != null,
            "should have not authorized message"
        ).equal(true);
    });

    it("User A update second catalog", async function () {
        let response = await userAClient.mutate({
            mutation: UpdateCatalogDocument,
            variables: {
                identifier: {
                    catalogSlug: "user-a-second-catalog"
                },
                value: {
                    description: "Second description",
                    displayName: "Display after update",
                    isPublic: true,
                    newSlug: "user-a-second-catalog-v2",
                    website: "https://second-website.co.uk"
                }
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
        expect(response.data!.updateCatalog.description).to.equal("Second description");
        expect(response.data!.updateCatalog.displayName).to.equal("Display after update");
        expect(response.data!.updateCatalog.isPublic).to.equal(true);
        expect(response.data!.updateCatalog.identifier.catalogSlug).to.equal("user-a-second-catalog-v2");
        expect(response.data!.updateCatalog.website).to.equal("https://second-website.co.uk");
    });

    it("User B get User A second catalog", async function () {
        let response = await userBClient.query({
            query: GetCatalogDocument,
            variables: {
                identifier: {
                    catalogSlug: "user-a-second-catalog-v2"
                }
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
        expect(response.data!.catalog.description).to.equal("Second description");
        expect(response.data!.catalog.displayName).to.equal("Display after update");
        expect(response.data!.catalog.identifier.catalogSlug).to.equal("user-a-second-catalog-v2");
        expect(response.data!.catalog.website).to.equal("https://second-website.co.uk");
    });

    it("User B update User A's catalog - should fail", async function () {
        let response = await userBClient.mutate({
            mutation: UpdateCatalogDocument,
            variables: {
                identifier: {
                    catalogSlug: "user-a-second-catalog-v2"
                },
                value: {
                    description: "Second description",
                    displayName: "Display after update",
                    isPublic: true,
                    newSlug: "user-a-second-catalog-v2",
                    website: "https://second-website.co.uk"
                }
            }
        });

        expect(response.errors != null, "error should be returned").to.equal(true);
        expect(
            response.errors!.find((e) => e.message == "NOT_AUTHORIZED") != null,
            "should have not authorized message"
        ).equal(true);
    });

    it("User A make catalog private again", async function () {
        let response = await userAClient.mutate({
            mutation: UpdateCatalogDocument,
            variables: {
                identifier: {
                    catalogSlug: "user-a-second-catalog-v2"
                },
                value: {
                    isPublic: false
                }
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
        expect(response.data!.updateCatalog.description).to.equal("Second description");
        expect(response.data!.updateCatalog.displayName).to.equal("Display after update");
        expect(response.data!.updateCatalog.isPublic, "should no longer be public").to.equal(false);
        expect(response.data!.updateCatalog.identifier.catalogSlug).to.equal("user-a-second-catalog-v2");
        expect(response.data!.updateCatalog.website).to.equal("https://second-website.co.uk");
    });

    it("User B Get User A private catalog - should fail", async function () {
        let response = await userBClient.query({
            query: GetCatalogDocument,
            variables: {
                identifier: {
                    catalogSlug: "user-a-second-catalog-v2"
                }
            }
        });

        expect(response.errors != null, "error should be returned").to.equal(true);
        expect(
            response.errors!.find((e) => e.message == "NOT_AUTHORIZED") != null,
            "should have not authorized message"
        ).equal(true);
    });

    it("Disable catalog", async function () {
        let response = await userAClient.mutate({
            mutation: DisableCatalogDocument,
            variables: {
                identifier: {
                    catalogSlug: "user-a-second-catalog-v2"
                }
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
    });

    it("User A Get Disabled Catalog", async function () {
        let response = await userAClient.query({
            query: GetCatalogDocument,
            variables: {
                identifier: {
                    catalogSlug: "user-a-second-catalog-v2"
                }
            }
        });

        expect(response.errors != null, "error should be returned").to.equal(true);
        expect(
            response.errors!.find((e) => e.message == "CATALOG_NOT_FOUND") != null,
            "should not return disabled catalog"
        ).equal(true);
    });

    // TODO Test package and catalog association, and permissions of packages in private catalogs
});
