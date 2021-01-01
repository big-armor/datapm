import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";
import { expect } from "chai";
import { CreatePackageDocument, Permission, SetPackagePermissionsDocument, PackageDocument } from "./registry-client";
import { createUser } from "./test-utils";
import { describe, it } from "mocha";

describe("Package Permissions", async () => {
    let userAClient: ApolloClient<NormalizedCacheObject>;
    let userBClient: ApolloClient<NormalizedCacheObject>;

    before(async () => {});

    it("Create users A & B and inital package", async function () {
        userAClient = await createUser(
            "UserAPackageFirst",
            "UserAPackageLast",
            "package-permission-user-test-A",
            "packagepermissiontestA@test.datapm.io",
            "packagePassword1!"
        );
        userBClient = await createUser(
            "UserBPackageFirst",
            "UserBPackageLast",
            "package-permission-user-test-B",
            "packagepermissiontestB@test.datapm.io",
            "packagePassword2!"
        );

        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: "package-permission-user-test-A",
                    packageSlug: "test-package-permission-v1",
                    displayName: "Package Permission Test v1",
                    description: "Testing Package Permissions"
                }
            }
        });

        expect(userAClient).to.exist;
        expect(userBClient).to.exist;
    });

    it("user attempting to grant permissions to a package on which they do not have the MANAGE permission", async function () {
        const newPermissions = [Permission.VIEW];

        let response = await userBClient.mutate({
            mutation: SetPackagePermissionsDocument,
            variables: {
                identifier: {
                    catalogSlug: "package-permission-user-test-A",
                    packageSlug: "test-package-permission-v1"
                },
                value: {
                    username: "package-permission-user-test-A",
                    permissions: newPermissions
                }
            }
        });

        expect(response.errors![0].message).to.equal("NOT_AUTHORIZED");
    });

    it("attempting to grant permissions to a user that does not exist", async function () {
        const newPermissions = [Permission.VIEW];

        let response = await userAClient.mutate({
            mutation: SetPackagePermissionsDocument,
            variables: {
                identifier: {
                    catalogSlug: "package-permission-user-test-A",
                    packageSlug: "test-package-permission-v1"
                },
                value: {
                    username: "my-user-does-not-exist-v9",
                    permissions: newPermissions
                }
            }
        });

        expect(response.errors![0].message).to.equal("USER_NOT_FOUND - my-user-does-not-exist-v9");
    });

    it("successfully setting permissions for authorized use case", async function () {
        const newPermissions = [Permission.VIEW];

        let response = await userAClient.mutate({
            mutation: SetPackagePermissionsDocument,
            variables: {
                identifier: {
                    catalogSlug: "package-permission-user-test-A",
                    packageSlug: "test-package-permission-v1"
                },
                value: {
                    username: "package-permission-user-test-B",
                    permissions: newPermissions
                }
            }
        });

        expect(response.errors! == null).true;
    });
});
