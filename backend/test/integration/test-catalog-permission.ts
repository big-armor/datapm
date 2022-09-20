import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";
import { expect } from "chai";
import {
    CreateCatalogDocument,
    CreatePackageDocument,
    Permission,
    SetUserCatalogPermissionDocument,
    GetCatalogDocument,
    UpdateCatalogDocument
} from "./registry-client";
import { createUser } from "./test-utils";
import { describe, it } from "mocha";

describe("Catalog Permissions", async () => {
    let userAClient: ApolloClient<NormalizedCacheObject>;
    let userBClient: ApolloClient<NormalizedCacheObject>;

    it("Create users A & B", async function () {
        userAClient = await createUser(
            "Tom",
            "Bradly",
            "my-test-user200",
            "tombradly200@test.datapm.io",
            "catPassword3!"
        );
        userBClient = await createUser(
            "Foo1",
            "Bar2",
            "my-test-user201",
            "tombradly201@test.datapm.io",
            "catPassword4!"
        );

        expect(userAClient).to.not.equal(undefined);
        expect(userBClient).to.not.equal(undefined);
    });

    it("user attempting to grant permissions to a catalog on which they do not have the MANAGE permission", async function () {
        await userAClient.mutate({
            mutation: CreateCatalogDocument,
            variables: {
                value: {
                    slug: "user-a-catalog-v1",
                    displayName: "User A Catalog v1",
                    description: "This is an integration test User A v1 Catalog",
                    website: "https://usera.datapm.io",
                    isPublic: false
                }
            }
        });

        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: "user-a-catalog-v1",
                    packageSlug: "congressional-legislators1",
                    displayName: "Congressional Legislators1",
                    description: "Test upload of congressional legislators1"
                }
            }
        });

        const newPermissions = [Permission.VIEW];

        const response = await userBClient.mutate({
            mutation: SetUserCatalogPermissionDocument,
            variables: {
                identifier: {
                    catalogSlug: "user-a-catalog-v1"
                },
                value: [
                    {
                        usernameOrEmailAddress: "my-test-user200",
                        permission: newPermissions,
                        packagePermissions: []
                    }
                ],
                message: "Test message"
            }
        });

        if (response.errors == null) {
            throw new Error("Expected error");
        }

        expect(response.errors[0].message).to.equal("NOT_AUTHORIZED");
    });

    it("attempting to grant permissions to a user that does not exist", async function () {
        const newPermissions = [Permission.VIEW];

        const response = await userAClient.mutate({
            mutation: SetUserCatalogPermissionDocument,
            variables: {
                identifier: {
                    catalogSlug: "user-a-catalog-v1"
                },
                value: [
                    {
                        usernameOrEmailAddress: "my-test-user202",
                        permission: newPermissions,
                        packagePermissions: []
                    }
                ],
                message: "Test message"
            }
        });

        if (response.errors == null) {
            throw new Error("Expected error");
        }

        expect(response.errors[0].message).to.equal("USER_NOT_FOUND - my-test-user202");
    });

    it("successfully setting permissions for authorized use case", async function () {
        const newPermissions: Permission[] = [Permission.VIEW, Permission.EDIT];

        const response = await userAClient.mutate({
            mutation: SetUserCatalogPermissionDocument,
            variables: {
                identifier: {
                    catalogSlug: "user-a-catalog-v1"
                },
                value: [
                    {
                        usernameOrEmailAddress: "my-test-user201",
                        permission: newPermissions,
                        packagePermissions: []
                    }
                ],
                message: "Test"
            }
        });

        expect(response.errors == null).equal(true);
    });

    it("updating user permissions by changing the permissions list", async function () {
        const newPermissions = [Permission.VIEW, Permission.EDIT];

        const response = await userAClient.mutate({
            mutation: SetUserCatalogPermissionDocument,
            variables: {
                identifier: {
                    catalogSlug: "user-a-catalog-v1"
                },
                value: [
                    {
                        usernameOrEmailAddress: "my-test-user201",
                        permission: newPermissions,
                        packagePermissions: []
                    }
                ],
                message: "Test message"
            }
        });

        expect(response.errors == null).equal(true);
    });

    it("Validate that the target user has the permission granted to view a catalog that they did not previously", async function () {
        await userAClient.mutate({
            mutation: CreateCatalogDocument,
            variables: {
                value: {
                    slug: "user-a-catalog-v2",
                    displayName: "User A catalog v2",
                    description: "This is an integration test User A v2",
                    website: "https://usera.datapm.io",
                    isPublic: false
                }
            }
        });

        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: "user-a-catalog-v2",
                    packageSlug: "congressional-legislators2",
                    displayName: "Congressional Legislators2",
                    description: "Test upload of congressional legislators"
                }
            }
        });

        const beforeGrantedViewOnUserB = await userBClient.query({
            query: GetCatalogDocument,
            variables: {
                identifier: {
                    catalogSlug: "user-a-catalog-v2"
                }
            }
        });

        const newPermissions: Permission[] = [Permission.VIEW];

        await userAClient.mutate({
            mutation: SetUserCatalogPermissionDocument,
            variables: {
                identifier: {
                    catalogSlug: "user-a-catalog-v2"
                },
                value: [
                    {
                        usernameOrEmailAddress: "my-test-user201",
                        permission: newPermissions,
                        packagePermissions: []
                    }
                ],
                message: "Test message"
            }
        });

        const afterGrantedViewOnUserB = await userBClient.query({
            query: GetCatalogDocument,
            variables: {
                identifier: {
                    catalogSlug: "user-a-catalog-v2"
                }
            }
        });

        if (beforeGrantedViewOnUserB.errors == null) {
            throw new Error("Expected error");
        }

        expect(beforeGrantedViewOnUserB.errors[0].message).to.equal("NOT_AUTHORIZED");
        expect(beforeGrantedViewOnUserB.data).to.equal(null);
        expect(afterGrantedViewOnUserB.data?.catalog.displayName).to.equal("User A catalog v2");
        expect(afterGrantedViewOnUserB.data?.catalog.description).to.equal("This is an integration test User A v2");
    });

    it("Inserting empty permissions array and deleting if empty", async function () {
        await userAClient.mutate({
            mutation: CreateCatalogDocument,
            variables: {
                value: {
                    slug: "user-a-catalog-v3",
                    displayName: "User A catalog v3",
                    description: "This is an integration test User A v3",
                    website: "https://usera.datapm.io",
                    isPublic: false
                }
            }
        });

        const newPermissions: Permission[] = [];

        const response = await userAClient.mutate({
            mutation: SetUserCatalogPermissionDocument,
            variables: {
                identifier: {
                    catalogSlug: "user-a-catalog-v3"
                },
                value: [
                    {
                        usernameOrEmailAddress: "my-test-user201",
                        permission: newPermissions,
                        packagePermissions: []
                    }
                ],
                message: "Testing messages"
            }
        });

        expect(response.errors == null).equal(true);
    });

    it("user with EDIT but without MANAGE permission trying to set the public value", async function () {
        await userAClient.mutate({
            mutation: CreateCatalogDocument,
            variables: {
                value: {
                    slug: "user-a-catalog-v4",
                    displayName: "User A Catalog v4",
                    description: "This is an integration test User A v4 Catalog",
                    website: "https://usera.datapm.io",
                    isPublic: false
                }
            }
        });

        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: "user-a-catalog-v4",
                    packageSlug: "congressional-legislators1",
                    displayName: "Congressional Legislators1",
                    description: "Test upload of congressional legislators4"
                }
            }
        });

        const newPermissions = [Permission.VIEW, Permission.EDIT];

        await userAClient.mutate({
            mutation: SetUserCatalogPermissionDocument,
            variables: {
                identifier: {
                    catalogSlug: "user-a-catalog-v4"
                },
                value: [
                    {
                        usernameOrEmailAddress: "my-test-user201",
                        permission: newPermissions,
                        packagePermissions: []
                    }
                ],
                message: "Testing messages"
            }
        });

        const response = await userBClient.mutate({
            mutation: UpdateCatalogDocument,
            variables: {
                identifier: {
                    catalogSlug: "user-a-catalog-v4"
                },
                value: {
                    isPublic: true
                }
            }
        });

        if (response.errors == null) {
            throw new Error("Expected error");
        }

        expect(response.errors[0].message).includes("NOT_AUTHORIZED");
    });
});
