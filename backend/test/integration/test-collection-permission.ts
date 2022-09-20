import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";
import { expect } from "chai";
import {
    CreateCollectionDocument,
    CreatePackageDocument,
    Permission,
    SetUserCollectionPermissionsDocument,
    DeleteUserCollectionPermissionsDocument,
    CollectionDocument,
    UsersByCollectionDocument,
    UpdateCollectionDocument
} from "./registry-client";
import { createUser } from "./test-utils";
import { describe, it } from "mocha";

describe("Collection Permissions", async () => {
    let userAClient: ApolloClient<NormalizedCacheObject>;
    let userBClient: ApolloClient<NormalizedCacheObject>;
    let userCClient: ApolloClient<NormalizedCacheObject>;

    it("Create users A & B", async function () {
        userAClient = await createUser("Alol", "Aulu", "my-test-user100", "hellocat12@test.datapm.io", "catPassword2!");
        userBClient = await createUser("Foo1", "Bar2", "my-test-user101", "hellocat13@test.datapm.io", "catPassword2!");
        userCClient = await createUser("Foo3", "Bar3", "my-test-user102", "hellocat14@test.datapm.io", "catPassword2!");

        expect(userAClient).to.not.equal(undefined);
        expect(userBClient).to.not.equal(undefined);
        expect(userCClient).to.not.equal(undefined);
    });

    it("user attempting to grant permissions to a collection on which they do not have the MANAGE permission", async function () {
        await userAClient.mutate({
            mutation: CreateCollectionDocument,
            variables: {
                value: {
                    collectionSlug: "testA-collection-permissions",
                    name: "testing collectionPackages1",
                    description: "asdfsdfsdf"
                }
            }
        });

        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: "my-test-user100",
                    packageSlug: "congressional-legislators1",
                    displayName: "Congressional Legislators1",
                    description: "Test upload of congressional legislators1"
                }
            }
        });

        const newPermissions = [Permission.VIEW];

        const response = await userBClient.mutate({
            mutation: SetUserCollectionPermissionsDocument,
            variables: {
                identifier: {
                    collectionSlug: "testA-collection-permissions"
                },
                value: [
                    {
                        usernameOrEmailAddress: "my-test-user100",
                        permissions: newPermissions
                    }
                ],
                message: "Test"
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
            mutation: SetUserCollectionPermissionsDocument,
            variables: {
                identifier: {
                    collectionSlug: "testA-collection-permissions"
                },
                value: [
                    {
                        usernameOrEmailAddress: "my-test-user103",
                        permissions: newPermissions
                    }
                ],
                message: "Testing"
            }
        });

        if (response.errors == null) {
            throw new Error("Expected error");
        }
        expect(response.errors[0].message).to.equal("USER_NOT_FOUND - my-test-user103");
    });

    it("Can not set permissions for creator", async function () {
        const newPermissions = [Permission.VIEW];
        const response = await userAClient.mutate({
            mutation: SetUserCollectionPermissionsDocument,
            variables: {
                identifier: {
                    collectionSlug: "testA-collection-permissions"
                },
                value: [
                    {
                        usernameOrEmailAddress: "my-test-user100",
                        permissions: newPermissions
                    }
                ],
                message: "testing"
            }
        });

        if (response.errors == null) {
            throw new Error("Expected error");
        }
        expect(response.errors?.find((e) => e.message.includes("CANNOT_SET_COLLECTION_CREATOR_PERMISSIONS"))).not.equal(
            null
        );
    });

    it("successfully setting permissions for authorized use case", async function () {
        const newPermissions = [Permission.VIEW];
        const response = await userAClient.mutate({
            mutation: SetUserCollectionPermissionsDocument,
            variables: {
                identifier: {
                    collectionSlug: "testA-collection-permissions"
                },
                value: [
                    {
                        usernameOrEmailAddress: "my-test-user101",
                        permissions: newPermissions
                    }
                ],
                message: "Testing message"
            }
        });

        expect(response.errors == null).equal(true);
    });

    it("get users list for collection", async function () {
        const response = await userAClient.query({
            query: UsersByCollectionDocument,
            variables: {
                identifier: {
                    collectionSlug: "testA-collection-permissions"
                }
            }
        });

        expect(response.errors == null).equal(true);

        const testUserPersmission = response.data.usersByCollection.find((f) => f.user.username === "my-test-user101");

        if (testUserPersmission == null) {
            throw new Error("Expected user to exist");
        }

        expect(testUserPersmission).to.not.equal(undefined);
        expect(testUserPersmission.permissions.includes(Permission.VIEW)).to.equal(true);
        expect(testUserPersmission.permissions.includes(Permission.EDIT)).to.equal(false);
        expect(testUserPersmission.permissions.includes(Permission.MANAGE)).to.equal(false);
    });

    it("update collection user permissions by changing the permissions list", async function () {
        const newPermissions = [Permission.VIEW, Permission.EDIT, Permission.MANAGE];

        const response = await userAClient.mutate({
            mutation: SetUserCollectionPermissionsDocument,
            variables: {
                identifier: {
                    collectionSlug: "testA-collection-permissions"
                },
                value: [
                    {
                        usernameOrEmailAddress: "my-test-user101",
                        permissions: newPermissions
                    }
                ],
                message: "Testing test"
            }
        });

        expect(response.errors == null).equal(true);
    });

    it("get users list for collection part 2", async function () {
        const response = await userAClient.query({
            query: UsersByCollectionDocument,
            variables: {
                identifier: {
                    collectionSlug: "testA-collection-permissions"
                }
            }
        });

        expect(response.errors == null).equal(true);

        const testUserPersmission = response.data.usersByCollection.find((f) => f.user.username === "my-test-user101");

        if (testUserPersmission == null) {
            throw new Error("Expected user to exist");
        }

        expect(testUserPersmission).to.not.equal(undefined);
        expect(testUserPersmission.permissions.includes(Permission.VIEW)).to.equal(true);
        expect(testUserPersmission.permissions.includes(Permission.EDIT)).to.equal(true);
        expect(testUserPersmission.permissions.includes(Permission.MANAGE)).to.equal(true);
    });

    it("Should not allow other user to remove creator permissions", async function () {
        const response = await userBClient.mutate({
            mutation: DeleteUserCollectionPermissionsDocument,
            variables: {
                identifier: {
                    collectionSlug: "testA-collection-permissions"
                },
                usernameOrEmailAddress: "my-test-user100"
            }
        });

        expect(response.errors != null).equal(true);
        expect(response.errors?.find((e) => e.message.includes("CANNOT_REMOVE_CREATOR_PERMISSIONS"))).not.equal(null);
    });

    it("Validate that the target user has the permission granted to view a collection that they did not previously", async function () {
        await userAClient.mutate({
            mutation: CreateCollectionDocument,
            variables: {
                value: {
                    collectionSlug: "testF-collection",
                    name: "testing collectionPackages5",
                    description: "UserB Will Find This After Granted View Permissions"
                }
            }
        });

        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: "my-test-user100",
                    packageSlug: "congressional-legislators5",
                    displayName: "Congressional Legislators5",
                    description: "Test upload of congressional legislators"
                }
            }
        });

        const beforeGrantedViewOnUserB = await userBClient.query({
            query: CollectionDocument,
            variables: {
                identifier: {
                    collectionSlug: "testF-collection"
                }
            }
        });

        const newPermissions = [Permission.VIEW];

        await userAClient.mutate({
            mutation: SetUserCollectionPermissionsDocument,
            variables: {
                identifier: {
                    collectionSlug: "testF-collection"
                },
                value: [
                    {
                        usernameOrEmailAddress: "my-test-user101",
                        permissions: newPermissions
                    }
                ],
                message: "Testing testing"
            }
        });

        const afterGrantedViewOnUserB = await userBClient.query({
            query: CollectionDocument,
            variables: {
                identifier: {
                    collectionSlug: "testF-collection"
                }
            }
        });

        if (beforeGrantedViewOnUserB.errors == null) {
            throw new Error("Expected error");
        }
        expect(beforeGrantedViewOnUserB.errors[0].message).to.equal("NOT_AUTHORIZED");
        expect(beforeGrantedViewOnUserB.data).to.equal(null);
        expect(afterGrantedViewOnUserB.data?.collection.name).to.equal("testing collectionPackages5");
        expect(afterGrantedViewOnUserB.data?.collection.description).to.equal(
            "UserB Will Find This After Granted View Permissions"
        );
    });

    it("remove user B manage permission", async function () {
        const newPermissions = [Permission.VIEW, Permission.EDIT];

        const response = await userAClient.mutate({
            mutation: SetUserCollectionPermissionsDocument,
            variables: {
                identifier: {
                    collectionSlug: "testA-collection-permissions"
                },
                value: [
                    {
                        usernameOrEmailAddress: "my-test-user101",
                        permissions: newPermissions
                    }
                ],
                message: "Testing test"
            }
        });

        expect(response.errors == null).equal(true);
    });

    it("get users list for collection part 2", async function () {
        const response = await userAClient.query({
            query: UsersByCollectionDocument,
            variables: {
                identifier: {
                    collectionSlug: "testA-collection-permissions"
                }
            }
        });

        expect(response.errors == null).equal(true);

        const testUserPersmission = response.data.usersByCollection.find((f) => f.user.username === "my-test-user101");

        if (testUserPersmission == null) {
            throw new Error("Expected user to exist");
        }
        expect(testUserPersmission).to.not.equal(undefined);
        expect(testUserPersmission.permissions.includes(Permission.VIEW)).to.equal(true);
        expect(testUserPersmission.permissions.includes(Permission.EDIT)).to.equal(true);
        expect(testUserPersmission.permissions.includes(Permission.MANAGE)).to.equal(false);
    });

    it("should allow user b to edit the collection", async function () {
        const response = await userBClient.mutate({
            mutation: UpdateCollectionDocument,
            variables: {
                identifier: {
                    collectionSlug: "testA-collection-permissions"
                },
                value: {
                    description: "new description"
                }
            }
        });

        expect(response.errors == null).equal(true);
        expect(response.data?.updateCollection.description).equal("new description");
    });

    it("should not allow user b to change the collection public setting", async function () {
        const response = await userBClient.mutate({
            mutation: UpdateCollectionDocument,
            variables: {
                identifier: {
                    collectionSlug: "testA-collection-permissions"
                },
                value: {
                    isPublic: true
                }
            }
        });

        if (response.errors == null) {
            throw new Error("Expected error");
        }
        expect(response.errors.length).equal(1);
        expect(response.errors.find((e) => e.message.startsWith("NOT_AUTHORIZED"))).to.not.equal(undefined);
    });

    it("should allow user a to make the collection public", async function () {
        const response = await userAClient.mutate({
            mutation: UpdateCollectionDocument,
            variables: {
                identifier: {
                    collectionSlug: "testA-collection-permissions"
                },
                value: {
                    isPublic: true
                }
            }
        });

        expect(response.errors).to.equal(undefined);
    });

    it("should return only view permission for user C", async function () {
        const response = await userCClient.query({
            query: CollectionDocument,
            variables: {
                identifier: {
                    collectionSlug: "testA-collection-permissions"
                }
            }
        });

        if (response.data.collection.myPermissions == null) {
            throw new Error("Expected myPermissions to exist");
        }
        expect(response.data.collection.myPermissions?.length).equal(1);
        expect(response.data.collection.myPermissions[0]).equal(Permission.VIEW);
    });
});
