import { ApolloClient, NormalizedCacheObject, ServerError } from "@apollo/client/core";
import { ErrorResponse } from "apollo-link-error";
import { expect } from "chai";
import {
    DeleteCatalogDocument,
    UpdateCatalogDocument,
    MyCatalogsDocument,
    MyCatalogsQuery,
    MyCatalogsQueryVariables,
    CreateCatalogDocument,
    GetCatalogDocument,
    CreatePackageDocument,
    UpdatePackageDocument,
    PackageDocument,
    CatalogPackagesDocument,
    CreateVersionDocument,
    UpdateMeDocument,
    Permission,
    UserCatalogsDocument,
    SetUserCatalogPermissionDocument,
    SetPackagePermissionsDocument,
    DeleteUserCatalogPermissionsDocument,
    SetUserCollectionPermissionsDocument
} from "./registry-client";
import { AdminHolder } from "./admin-holder";
import { createAnonymousClient, createUser } from "./test-utils";
import { describe, it } from "mocha";
import { loadPackageFileFromDisk } from "datapm-lib";

describe("Catalog Tests", async () => {
    let userAClient: ApolloClient<NormalizedCacheObject>;
    let userBClient: ApolloClient<NormalizedCacheObject>;
    let anonymousClient: ApolloClient<NormalizedCacheObject>;

    let adminClient: ApolloClient<NormalizedCacheObject>;

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
        anonymousClient = createAnonymousClient();

        adminClient = AdminHolder.adminClient;

        expect(userAClient).to.not.equal(undefined);
        expect(userBClient).to.not.equal(undefined);
        expect(adminClient).to.not.equal(undefined);
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
                expect(value).to.not.equal(undefined);

                if (value) {
                    const catalogs = value?.data.myCatalogs;

                    if (catalogs[0] == null) {
                        throw new Error("Catalogs[0] is null");
                    }

                    if (catalogs[0].myPermissions == null) {
                        throw new Error("Catalogs[0].myPermissions is null");
                    }
                    expect(catalogs.length).equal(1);

                    expect(catalogs[0].identifier.catalogSlug === "testA-catalog");
                    expect(catalogs[0].isPublic).equal(false);
                    expect(catalogs[0].myPermissions.length).equal(3);
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
                expect(value).to.not.equal(undefined);

                if (value) {
                    const catalogs = value.data.myCatalogs;

                    expect(catalogs.length).equal(1);

                    if (catalogs[0] == null) {
                        throw new Error("Catalogs[0] is null");
                    }

                    if (catalogs[0].myPermissions == null) {
                        throw new Error("Catalogs[0].myPermissions is null");
                    }

                    expect(catalogs[0].identifier.catalogSlug === "testB-catalog");
                    expect(catalogs[0].isPublic).equal(false);
                    expect(catalogs[0].myPermissions.length).equal(3);
                } else {
                    expect(true, "value to exist").equal(false);
                }
            });
    });

    it("Catalog that does not yet exist - should fail", async function () {
        const response = await userBClient.query({
            query: GetCatalogDocument,
            variables: {
                identifier: {
                    catalogSlug: "user-a-second-catalog-v2"
                }
            }
        });

        expect(
            response.errors?.find((e) => e.message.startsWith("CATALOG_NOT_FOUND")) != null,
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
                const fetchResult = error.networkError as ServerError;
                if (
                    fetchResult.result.errors.find(
                        (e: { extensions: { exception: { stacktrace: string[] } } }) =>
                            e.extensions.exception.stacktrace.find(
                                (s) => s === "ValidationError: CATALOG_SLUG_REQUIRED"
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
                const fetchResult = error.networkError as ServerError;
                if (
                    fetchResult.result.errors.find(
                        (e: { extensions: { exception: { stacktrace: string[] } } }) =>
                            e.extensions.exception.stacktrace.find(
                                (s) => s === "ValidationError: CATALOG_SLUG_INVALID"
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
                const fetchResult = error.networkError as ServerError;
                if (
                    fetchResult.result.errors.find(
                        (e: { extensions: { exception: { stacktrace: string[] } } }) =>
                            e.extensions.exception.stacktrace.find(
                                (s) => s === "ValidationError: CATALOG_SLUG_TOO_LONG"
                            ) != null
                    ) != null
                )
                    errorFound = true;
            })
            .then((client) => {
                expect(errorFound, "catalog slug too long error returned").equal(true);
            });
    });

    it("Non admin user can't create unclaimed catalog", async function () {
        const response = await userBClient.mutate({
            mutation: CreateCatalogDocument,
            variables: {
                value: {
                    slug: "user-a-unclaimed-catalog",
                    displayName: "User A Second Catalog",
                    description: "This is an integration test User A second catalog",
                    website: "https://usera.datapm.io",
                    isPublic: false,
                    unclaimed: true
                }
            }
        });

        expect(response.data).equal(null);
        if (!response.errors || !response.errors[0]) {
            expect(true, "Should've received not authorized error for non admin user").equal(false);
            return;
        }

        expect(response.errors[0].message === "NOT_AUTHORIZED");
    });

    it("Non admin user can't update unclaimed catalog with manage permissions", async function () {
        await adminClient.mutate({
            mutation: CreateCatalogDocument,
            variables: {
                value: {
                    slug: "shared-admin-unclaimed-catalog",
                    displayName: "User A Second Catalog",
                    description: "This is an integration test User A second catalog",
                    website: "https://usera.datapm.io",
                    isPublic: false,
                    unclaimed: true
                }
            }
        });

        await userBClient.mutate({
            mutation: SetUserCollectionPermissionsDocument,
            variables: {
                identifier: {
                    collectionSlug: "shared-admin-unclaimed-catalog"
                },
                value: [
                    {
                        usernameOrEmailAddress: "testA-catalog@test.datapm.io",
                        permissions: [Permission.VIEW, Permission.EDIT, Permission.MANAGE]
                    }
                ],
                message: "Test"
            }
        });

        const response = await userAClient.mutate({
            mutation: UpdateCatalogDocument,
            variables: {
                identifier: {
                    catalogSlug: "admin-user-unclaimed-catalog"
                },
                value: {
                    description: "Second description",
                    displayName: "Display after update",
                    isPublic: true,
                    unclaimed: false,
                    newSlug: "update-shared-admin-unclaimed-catalog",
                    website: "https://second-website.co.uk"
                }
            }
        });

        expect(response.data).equal(null);
        if (!response.errors || !response.errors[0]) {
            expect(true, "Should've received not authorized error for non admin user").equal(false);
            return;
        }

        expect(response.errors[0].message === "NOT_AUTHORIZED");
    });

    it("Admin user can create unclaimed catalog", async function () {
        const response = await adminClient.mutate({
            mutation: CreateCatalogDocument,
            variables: {
                value: {
                    slug: "user-a-unclaimed-catalog",
                    displayName: "User A Second Catalog",
                    description: "This is an integration test User A second catalog",
                    website: "https://usera.datapm.io",
                    isPublic: false,
                    unclaimed: true
                }
            }
        });

        expect(response.errors).equal(undefined);
        if (!response.data || !response.data.createCatalog) {
            expect(true, "Should've been able to create unclaimed catalog").equal(false);
        }
    });

    it("Admin user can update unclaimed catalog", async function () {
        await adminClient.mutate({
            mutation: CreateCatalogDocument,
            variables: {
                value: {
                    slug: "admin-user-unclaimed-catalog",
                    displayName: "User A Second Catalog",
                    description: "This is an integration test User A second catalog",
                    website: "https://usera.datapm.io",
                    isPublic: false,
                    unclaimed: true
                }
            }
        });

        const response = await adminClient.mutate({
            mutation: UpdateCatalogDocument,
            variables: {
                identifier: {
                    catalogSlug: "admin-user-unclaimed-catalog"
                },
                value: {
                    description: "Second description",
                    displayName: "Display after update",
                    isPublic: true,
                    unclaimed: false,
                    newSlug: "updated-admin-user-unclaimed-catalog",
                    website: "https://second-website.co.uk"
                }
            }
        });

        expect(response.errors).equal(undefined);
        if (!response.data || !response.data.updateCatalog) {
            expect(true, "Should've been able to create unclaimed catalog").equal(false);
        }
    });

    it("All users can access unclaimed catalogs", async function () {
        await adminClient.mutate({
            mutation: CreateCatalogDocument,
            variables: {
                value: {
                    slug: "public-unclaimed-catalog",
                    displayName: "User A Second Catalog",
                    description: "This is an integration test User A second catalog",
                    website: "https://usera.datapm.io",
                    isPublic: false,
                    unclaimed: true
                }
            }
        });

        const response = await userAClient.query({
            query: GetCatalogDocument,
            variables: {
                identifier: {
                    catalogSlug: "public-unclaimed-catalog"
                }
            }
        });

        expect(response.data).to.not.equal(null);
        expect(response.data).to.not.equal(undefined);
        expect(response.error).to.equal(undefined);
    });

    it("Unclaimed catalogs are not included in user catalogs", async function () {
        const response = await userAClient.query({
            query: UserCatalogsDocument,
            variables: {
                username: AdminHolder.adminUsername,
                limit: 5,
                offSet: 0
            }
        });
        expect(response.error).to.equal(undefined);

        expect(response.data.userCatalogs.catalogs?.length).equal(1);
    });

    it("User A Create Second Catalog", async function () {
        const response = await userAClient.mutate({
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

        expect(response.errors == null, "no errors returned").to.equal(true);

        expect(response.data?.createCatalog.description, "correct description").to.equal(
            "This is an integration test User A second catalog"
        );
        expect(response.data?.createCatalog.identifier.catalogSlug, "correct slug").to.equal("user-a-second-catalog");
        expect(response.data?.createCatalog.displayName, "correct displayName").to.equal("User A Second Catalog");
        expect(response.data?.createCatalog.website, "correct website").to.equal("https://usera.datapm.io");
        expect(response.data?.createCatalog.isPublic, "not public").to.equal(false);
        expect(response.data?.createCatalog.myPermissions?.length).to.equal(3);
    });

    it("User A Get Second Catalog", async function () {
        const response = await userAClient.query({
            query: GetCatalogDocument,
            variables: {
                identifier: {
                    catalogSlug: "user-a-second-catalog"
                }
            }
        });

        expect(response.errors == null, "no errors returned").to.equal(true);

        expect(response.data?.catalog.description, "correct description").to.equal(
            "This is an integration test User A second catalog"
        );
        expect(response.data?.catalog.identifier.catalogSlug, "correct slug").to.equal("user-a-second-catalog");
        expect(response.data?.catalog.displayName, "correct displayName").to.equal("User A Second Catalog");
        expect(response.data?.catalog.website, "correct website").to.equal("https://usera.datapm.io");
        expect(response.data?.catalog.myPermissions?.length).to.equal(3);
    });

    it("User A add package to catalog", async function () {
        const response = await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: "user-a-second-catalog",
                    packageSlug: "us-congressional-legislators",
                    displayName: "Congressional Legislators",
                    description: "Test upload of congressional legislatorsA"
                }
            }
        });

        expect(response.errors == null).equal(true);
    });

    it("User A set package public - should fail", async function () {
        const response = await userAClient.mutate({
            mutation: UpdatePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "user-a-second-catalog",
                    packageSlug: "us-congressional-legislators"
                },
                value: {
                    isPublic: true
                }
            }
        });

        expect(response.errors?.find((e) => e.message.includes("CATALOG_NOT_PUBLIC")) != null).equal(true);
    });

    it("User B Get User A private catalog - should fail", async function () {
        const response = await userBClient.query({
            query: GetCatalogDocument,
            variables: {
                identifier: {
                    catalogSlug: "user-a-second-catalog"
                }
            }
        });

        expect(response.errors != null, "error should be returned").to.equal(true);
        expect(
            response.errors?.find((e) => e.message === "NOT_AUTHORIZED") != null,
            "should have not authorized message"
        ).equal(true);
    });

    it("User B List User A catalogs - should be empty", async function () {
        const response = await userBClient.query({
            query: UserCatalogsDocument,
            variables: {
                username: "testA-catalog",
                offSet: 0,
                limit: 10
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
        expect(response.data.userCatalogs.hasMore).to.equal(false);
        expect(response.data.userCatalogs.count).to.equal(0);
        expect(response.data.userCatalogs.catalogs?.length).to.equal(0);
    });

    it("User A set package public - should fail", async function () {
        const response = await userAClient.mutate({
            mutation: UpdatePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "user-a-second-catalog",
                    packageSlug: "us-congressional-legislators"
                },
                value: {
                    isPublic: true
                }
            }
        });
        expect(response.errors != null).equal(true);
        expect(response.errors?.find((e) => e.message.includes("CATALOG_NOT_PUBLIC")) != null).equal(true);
    });

    it("User A update second catalog", async function () {
        const response = await userAClient.mutate({
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
        expect(response.data?.updateCatalog.description).to.equal("Second description");
        expect(response.data?.updateCatalog.displayName).to.equal("Display after update");
        expect(response.data?.updateCatalog.isPublic).to.equal(true);
        expect(response.data?.updateCatalog.identifier.catalogSlug).to.equal("user-a-second-catalog-v2");
        expect(response.data?.updateCatalog.website).to.equal("https://second-website.co.uk");
    });

    it("User B get User A second catalog", async function () {
        const response = await userBClient.query({
            query: GetCatalogDocument,
            variables: {
                identifier: {
                    catalogSlug: "user-a-second-catalog-v2"
                }
            }
        });

        if (response.data?.catalog.myPermissions == null) {
            throw new Error("No permissions returned");
        }
        expect(response.errors == null, "no errors").to.equal(true);
        expect(response.data?.catalog.description).to.equal("Second description");
        expect(response.data?.catalog.displayName).to.equal("Display after update");
        expect(response.data?.catalog.identifier.catalogSlug).to.equal("user-a-second-catalog-v2");
        expect(response.data?.catalog.website).to.equal("https://second-website.co.uk");
        expect(response.data?.catalog.myPermissions[0]).to.equal(Permission.VIEW);
    });

    it("User B List User A catalogs - should return catalog", async function () {
        const response = await userBClient.query({
            query: UserCatalogsDocument,
            variables: {
                username: "testA-catalog",
                offSet: 0,
                limit: 10
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
        expect(response.data.userCatalogs.hasMore).to.equal(false);
        expect(response.data.userCatalogs.count).to.equal(1);
        expect(response.data.userCatalogs.catalogs?.length).to.equal(1);
    });

    it("Anonymous User List User A catalogs - should return catalog", async function () {
        const response = await anonymousClient.query({
            query: UserCatalogsDocument,
            variables: {
                username: "testA-catalog",
                offSet: 0,
                limit: 10
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
        expect(response.data.userCatalogs.hasMore).to.equal(false);
        expect(response.data.userCatalogs.count).to.equal(1);
        expect(response.data.userCatalogs.catalogs?.length).to.equal(1);
    });

    it("User A publish first version", async function () {
        const packageFileContents = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");

        const packageFileString = JSON.stringify(packageFileContents);

        const response = await userAClient.mutate({
            mutation: CreateVersionDocument,
            variables: {
                identifier: {
                    catalogSlug: "user-a-second-catalog-v2",
                    packageSlug: "us-congressional-legislators"
                },
                value: {
                    packageFile: packageFileString
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);
    });

    it("User B get package should fail - package not public", async function () {
        const response = await userBClient.query({
            query: PackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "user-a-second-catalog-v2",
                    packageSlug: "us-congressional-legislators"
                }
            }
        });

        expect(response.errors != null).equal(true);
        expect(
            response.errors?.find((p) => p.message.includes("NOT_AUTHORIZED")) != null,
            "Should return NOT_AUTHORIZED"
        ).equal(true);
    });

    it("User A set package public", async function () {
        const response = await userAClient.mutate({
            mutation: UpdatePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "user-a-second-catalog-v2",
                    packageSlug: "us-congressional-legislators"
                },
                value: {
                    isPublic: true
                }
            }
        });

        expect(response.errors == null).equal(true);
    });

    it("User B get package", async function () {
        const response = await userBClient.query({
            query: PackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "user-a-second-catalog-v2",
                    packageSlug: "us-congressional-legislators"
                }
            }
        });

        expect(response.errors == null).equal(true);
        expect(response.data?.package.identifier.packageSlug).equals("us-congressional-legislators");
    });

    it("User B update User A's catalog - should fail", async function () {
        const response = await userBClient.mutate({
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
            response.errors?.find((e) => e.message === "NOT_AUTHORIZED") != null,
            "should have not authorized message"
        ).equal(true);
    });

    it("User A make catalog private again", async function () {
        const response = await userAClient.mutate({
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
        expect(response.data?.updateCatalog.description).to.equal("Second description");
        expect(response.data?.updateCatalog.displayName).to.equal("Display after update");
        expect(response.data?.updateCatalog.isPublic, "should no longer be public").to.equal(false);
        expect(response.data?.updateCatalog.identifier.catalogSlug).to.equal("user-a-second-catalog-v2");
        expect(response.data?.updateCatalog.website).to.equal("https://second-website.co.uk");
    });

    it("User B Get User A private catalog - should fail", async function () {
        const response = await userBClient.query({
            query: GetCatalogDocument,
            variables: {
                identifier: {
                    catalogSlug: "user-a-second-catalog-v2"
                }
            }
        });

        expect(response.errors != null, "error should be returned").to.equal(true);
        expect(
            response.errors?.find((e) => e.message === "NOT_AUTHORIZED") != null,
            "should have not authorized message"
        ).equal(true);
    });

    it("User A get package - check is not public", async function () {
        const response = await userAClient.query({
            query: PackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "user-a-second-catalog-v2",
                    packageSlug: "us-congressional-legislators"
                }
            }
        });

        expect(response.errors == null).equal(true);
        expect(response.data?.package.identifier.packageSlug).equals("us-congressional-legislators");
        expect(response.data?.package.isPublic).equals(false);
    });

    it("User A grant catalog permissions to User B", async function () {
        const response = await userAClient.mutate({
            mutation: SetUserCatalogPermissionDocument,
            variables: {
                identifier: {
                    catalogSlug: "user-a-second-catalog-v2"
                },
                value: [
                    {
                        permission: [Permission.VIEW, Permission.EDIT, Permission.MANAGE],
                        packagePermissions: [],
                        usernameOrEmailAddress: "testB-catalog"
                    }
                ],
                message: "Testing testing test"
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
    });

    it("User B get User A second catalog", async function () {
        const response = await userBClient.query({
            query: GetCatalogDocument,
            variables: {
                identifier: {
                    catalogSlug: "user-a-second-catalog-v2"
                }
            }
        });

        if (response.data?.catalog.myPermissions == null) {
            throw new Error("myPermissions should be defined");
        }

        expect(response.errors == null, "no errors").to.equal(true);
        expect(response.data?.catalog.myPermissions.includes(Permission.VIEW)).equal(true);
        expect(response.data?.catalog.myPermissions.includes(Permission.EDIT)).equal(true);
        expect(response.data?.catalog.myPermissions.includes(Permission.MANAGE)).equal(true);
    });

    it("User A request user catalogs, should include second catalog", async function () {
        const response = await userAClient.query({
            query: UserCatalogsDocument,
            variables: {
                username: "testB-catalog",
                limit: 100,
                offSet: 0
            }
        });
        expect(response.errors == null, "no errors").to.equal(true);
        expect(
            response.data?.userCatalogs.catalogs?.find((c) => c.identifier.catalogSlug === "user-a-second-catalog-v2")
        ).to.not.equal(undefined);
    });

    it("User A grant catalog permissions to User B", async function () {
        const response = await userAClient.mutate({
            mutation: SetUserCatalogPermissionDocument,
            variables: {
                identifier: {
                    catalogSlug: "user-a-second-catalog-v2"
                },
                value: [
                    {
                        permission: [Permission.VIEW, Permission.EDIT, Permission.MANAGE],
                        packagePermissions: [Permission.VIEW],
                        usernameOrEmailAddress: "testB-catalog"
                    }
                ],
                message: "Testing test"
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
    });

    it("User B get User A second catalog", async function () {
        const response = await userBClient.query({
            query: GetCatalogDocument,
            variables: {
                identifier: {
                    catalogSlug: "user-a-second-catalog-v2"
                }
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);

        const packagesResponse = await userBClient.query({
            query: CatalogPackagesDocument,
            variables: {
                limit: 100,
                offset: 0,
                identifier: {
                    catalogSlug: "user-a-second-catalog-v2"
                }
            }
        });

        expect(packagesResponse.data?.catalogPackages?.length).to.equal(1);
    });

    it("User B can't delete permissions of creator User A", async function () {
        const response = await userBClient.mutate({
            mutation: DeleteUserCatalogPermissionsDocument,
            variables: {
                identifier: {
                    catalogSlug: "user-a-second-catalog-v2"
                },
                usernameOrEmailAddress: "testA-catalog"
            }
        });

        expect(response.errors != null).equal(true);
        expect(response.errors?.find((e) => e.message.includes("CANNOT_REMOVE_CREATOR_PERMISSIONS"))).not.equal(null);
    });

    it("User A remove catalog package permissions for User B", async function () {
        const response = await userAClient.mutate({
            mutation: SetUserCatalogPermissionDocument,
            variables: {
                identifier: {
                    catalogSlug: "user-a-second-catalog-v2"
                },
                value: [
                    {
                        permission: [Permission.VIEW],
                        packagePermissions: [],
                        usernameOrEmailAddress: "testB-catalog"
                    }
                ],
                message: "Testing"
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
    });

    it("Give User B package permissions", async function () {
        const response = await userAClient.mutate({
            mutation: SetPackagePermissionsDocument,
            variables: {
                identifier: {
                    catalogSlug: "user-a-second-catalog-v2",
                    packageSlug: "us-congressional-legislators"
                },
                value: [
                    {
                        usernameOrEmailAddress: "testB-catalog",
                        permissions: [Permission.VIEW]
                    }
                ],
                message: "Testing test"
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
    });

    it("User B get User A second catalog", async function () {
        const response = await userBClient.query({
            query: GetCatalogDocument,
            variables: {
                identifier: {
                    catalogSlug: "user-a-second-catalog-v2"
                }
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);

        const packagesResponse = await userBClient.query({
            query: CatalogPackagesDocument,
            variables: {
                limit: 100,
                offset: 0,
                identifier: {
                    catalogSlug: "user-a-second-catalog-v2"
                }
            }
        });

        expect(packagesResponse.data?.catalogPackages?.length).to.equal(1);
    });

    it("Delete catalog", async function () {
        const response = await userAClient.mutate({
            mutation: DeleteCatalogDocument,
            variables: {
                identifier: {
                    catalogSlug: "user-a-second-catalog-v2"
                }
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
    });

    it("User A Get Deleted Catalog", async function () {
        const response = await userAClient.query({
            query: GetCatalogDocument,
            variables: {
                identifier: {
                    catalogSlug: "user-a-second-catalog-v2"
                }
            }
        });

        expect(response.errors != null, "error should be returned").to.equal(true);
        expect(
            response.errors?.find((e) => e.message.startsWith("CATALOG_NOT_FOUND")) != null,
            "should not return deleted catalog"
        ).equal(true);
    });

    it("should update catalog slug after changing a user's username", async () => {
        const response = await userAClient.mutate({
            mutation: UpdateMeDocument,
            variables: {
                value: {
                    username: "my-new-username-test-catalog"
                }
            }
        });

        expect(response.errors == null).equal(true);

        const catalogRequest = await userAClient.query({
            query: GetCatalogDocument,
            variables: {
                identifier: {
                    catalogSlug: "my-new-username-test-catalog"
                }
            }
        });

        expect(catalogRequest.errors == null).equal(true);
        expect(catalogRequest.data.catalog.identifier.catalogSlug).equal("my-new-username-test-catalog");
    });

    it("old catalog should not be available", async () => {
        const catalogRequest = await userAClient.query({
            query: GetCatalogDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-catalog"
                }
            }
        });

        expect(catalogRequest.errors?.find((e) => e.message.includes("CATALOG_NOT_FOUND")) != null).equal(true);
    });

    it("CatalogPackages returned in DESC order, with view permissions", async function () {
        await userAClient.mutate({
            mutation: CreateCatalogDocument,
            variables: {
                value: {
                    slug: "user-a-second-catalog-v3",
                    displayName: "User AAA",
                    description: "This is an integration test User A second catalog",
                    website: "https://usera.datapm.io",
                    isPublic: false
                }
            }
        });

        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: "user-a-second-catalog-v3",
                    packageSlug: "us-congressional-legislators-4",
                    displayName: "Congressional Legislator3s",
                    description: "Test upload of congressional legislatorsA"
                }
            }
        });

        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: "user-a-second-catalog-v3",
                    packageSlug: "us-congressional-legislators-5",
                    displayName: "Congressional Legislator4s",
                    description: "Test upload of congressional legislatorsA"
                }
            }
        });

        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: "user-a-second-catalog-v3",
                    packageSlug: "us-congressional-legislators-3",
                    displayName: "Congressional Legislator5s",
                    description: "Test upload of congressional legislatorsA"
                }
            }
        });

        const response = await userAClient.query({
            query: CatalogPackagesDocument,
            variables: {
                identifier: {
                    catalogSlug: "user-a-second-catalog-v3"
                },
                offset: 0,
                limit: 3
            }
        });

        expect(response.errors == null).equal(true);
        expect(response.data?.catalogPackages.length).to.equal(3);
    });
    // TODO Test package and catalog association, and permissions of packages in private catalogs
});
