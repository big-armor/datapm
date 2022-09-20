import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";
import { expect } from "chai";
import { loadPackageFileFromDisk } from "datapm-lib";
import {
    CreateCatalogDocument,
    CreatePackageDocument,
    CreatePackageIssueDocument,
    CreateVersionDocument,
    LoginDocument,
    MovePackageDocument,
    OrderBy,
    PackageDocument,
    PackageIssuesDocument,
    Permission,
    SetPackagePermissionsDocument,
    SetUserCatalogPermissionDocument,
    UpdatePackageDocument
} from "./registry-client";
import { createAnonymousClient, createUser } from "./test-utils";

describe("Package Issues and Comments Tests", async () => {
    const DATA_ENDPOINT_URL = "localhost:4000/data";
    const ORIGINAL_SOURCE_SLUG = "https://theunitedstates.io/congress-legislators/legislators-current.csv";
    const URL_ENCODED_SOURCE_SLUG = "https%3A%2F%2Ftheunitedstates.io%2Fcongress-legislators%2Flegislators-current.csv";

    let userAToken = "Bearer ";
    const userAPassword = "passwordA!";

    const userAUsername = "test-a-move";
    const userBUsername = "test-b-move";

    let userAClient: ApolloClient<NormalizedCacheObject>;
    let userBClient: ApolloClient<NormalizedCacheObject>;
    const anonymousClient = createAnonymousClient();

    it("Create users A & B", async function () {
        userAClient = await createUser(
            "FirstA",
            "LastA",
            userAUsername,
            userAUsername + "@test.datapm.io",
            userAPassword
        );
        userBClient = await createUser(
            "FirstB",
            "LastB",
            userBUsername,
            userBUsername + "@test.datapm.io",
            "passwordB!"
        );
        expect(userAClient).to.not.equal(undefined);
        expect(userBClient).to.not.equal(undefined);

        const userALogin = await anonymousClient.mutate({
            mutation: LoginDocument,
            variables: {
                username: userAUsername,
                password: userAPassword
            }
        });

        if (!userALogin.data?.login) {
            throw new Error("Authentication didn't work for user A");
        }

        userAToken += userALogin.data.login;

        await userAClient.mutate({
            mutation: CreateCatalogDocument,
            variables: {
                value: {
                    slug: "test-a-move-ctg",
                    displayName: "User A Second Catalog",
                    description: "This is an integration test User A second catalog",
                    website: "https://usera.datapm.io",
                    isPublic: false
                }
            }
        });

        await userBClient.mutate({
            mutation: CreateCatalogDocument,
            variables: {
                value: {
                    slug: "test-b-move-ctg",
                    displayName: "User B Second Catalog",
                    description: "This is an integration test User B second catalog",
                    website: "https://usera.datapm.io",
                    isPublic: false
                }
            }
        });
    });

    it("Shouldn't allow user to move a package without MANAGE package permissions", async function () {
        const inintialPackageCatalogSlug = "test-a-move";
        const targetPackageCatalogSlug = "test-a-move-ctg";
        const packageSlug = "test-a-move-pkg";

        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: inintialPackageCatalogSlug,
                    packageSlug: packageSlug,
                    displayName: "Congressional LegislatorsA",
                    description: "Test move of congressional legislatorsA"
                }
            }
        });

        await userAClient.mutate({
            mutation: SetPackagePermissionsDocument,
            variables: {
                identifier: {
                    catalogSlug: inintialPackageCatalogSlug,
                    packageSlug: packageSlug
                },
                value: [
                    {
                        usernameOrEmailAddress: userBUsername,
                        permissions: [Permission.VIEW, Permission.EDIT]
                    }
                ],
                message: "Testing test"
            }
        });

        await userAClient.mutate({
            mutation: SetUserCatalogPermissionDocument,
            variables: {
                identifier: {
                    catalogSlug: targetPackageCatalogSlug
                },
                value: [
                    {
                        usernameOrEmailAddress: userBUsername,
                        permission: [Permission.VIEW, Permission.EDIT, Permission.MANAGE],
                        packagePermissions: []
                    }
                ],
                message: "Test message"
            }
        });

        const response = await userBClient.mutate({
            mutation: MovePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: inintialPackageCatalogSlug,
                    packageSlug: packageSlug
                },
                catalogIdentifier: {
                    catalogSlug: targetPackageCatalogSlug
                }
            }
        });

        if (!response.errors || !response.errors[0]) {
            expect(true).equal(false, "Should've thrown an error");
            return;
        }

        expect(response.errors[0].message).equal("NOT_AUTHORIZED");
    });

    it("Should not allow user to move a package without EDIT target catalog permissions", async function () {
        const inintialPackageCatalogSlug = "test-a-move";
        const targetPackageCatalogSlug = "test-a-move-ctg";
        const packageSlug = "test-a-move-ctg";

        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: inintialPackageCatalogSlug,
                    packageSlug: packageSlug,
                    displayName: "Congressional LegislatorsA",
                    description: "Test move of congressional legislatorsA"
                }
            }
        });

        await userAClient.mutate({
            mutation: SetPackagePermissionsDocument,
            variables: {
                identifier: {
                    catalogSlug: inintialPackageCatalogSlug,
                    packageSlug: packageSlug
                },
                value: [
                    {
                        usernameOrEmailAddress: userBUsername,
                        permissions: [Permission.VIEW, Permission.EDIT, Permission.MANAGE]
                    }
                ],
                message: "Testing test"
            }
        });

        await userAClient.mutate({
            mutation: SetUserCatalogPermissionDocument,
            variables: {
                identifier: {
                    catalogSlug: targetPackageCatalogSlug
                },
                value: [
                    {
                        usernameOrEmailAddress: userBUsername,
                        permission: [Permission.VIEW],
                        packagePermissions: []
                    }
                ],
                message: "Test message"
            }
        });

        const response = await userBClient.mutate({
            mutation: MovePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: inintialPackageCatalogSlug,
                    packageSlug: packageSlug
                },
                catalogIdentifier: {
                    catalogSlug: targetPackageCatalogSlug
                }
            }
        });

        if (!response.errors || !response.errors[0]) {
            expect(true).equal(false, "Should've thrown an error");
            return;
        }

        expect(response.errors[0].message).equal("NOT_AUTHORIZED");
    });

    it("Should allow user to move a package with EDIT target catalog and MANAGE package permissions", async function () {
        const inintialPackageCatalogSlug = "test-a-move";
        const targetPackageCatalogSlug = "test-a-move-ctg";
        const packageSlug = "test-a-move-pkg-ctg-mng";

        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: inintialPackageCatalogSlug,
                    packageSlug: packageSlug,
                    displayName: "Congressional LegislatorsA",
                    description: "Test move of congressional legislatorsA"
                }
            }
        });

        await userAClient.mutate({
            mutation: SetPackagePermissionsDocument,
            variables: {
                identifier: {
                    catalogSlug: inintialPackageCatalogSlug,
                    packageSlug: packageSlug
                },
                value: [
                    {
                        usernameOrEmailAddress: userBUsername,
                        permissions: [Permission.VIEW, Permission.EDIT, Permission.MANAGE]
                    }
                ],
                message: "Testing test"
            }
        });

        await userAClient.mutate({
            mutation: SetUserCatalogPermissionDocument,
            variables: {
                identifier: {
                    catalogSlug: targetPackageCatalogSlug
                },
                value: [
                    {
                        usernameOrEmailAddress: userBUsername,
                        permission: [Permission.VIEW, Permission.EDIT],
                        packagePermissions: []
                    }
                ],
                message: "Test message"
            }
        });

        const response = await userBClient.mutate({
            mutation: MovePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: inintialPackageCatalogSlug,
                    packageSlug: packageSlug
                },
                catalogIdentifier: {
                    catalogSlug: targetPackageCatalogSlug
                }
            }
        });

        expect(response.errors).equal(undefined);
    });

    it("Should remove user permissions from package", async function () {
        const inintialPackageCatalogSlug = "test-a-move";
        const targetPackageCatalogSlug = "test-a-move-ctg";
        const packageSlug = "test-a-move-prms";

        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: inintialPackageCatalogSlug,
                    packageSlug: packageSlug,
                    displayName: "Congressional LegislatorsA",
                    description: "Test move of congressional legislatorsA"
                }
            }
        });

        await userAClient.mutate({
            mutation: SetPackagePermissionsDocument,
            variables: {
                identifier: {
                    catalogSlug: inintialPackageCatalogSlug,
                    packageSlug: packageSlug
                },
                value: [
                    {
                        usernameOrEmailAddress: userBUsername,
                        permissions: [Permission.VIEW, Permission.EDIT, Permission.MANAGE]
                    }
                ],
                message: "Testing test"
            }
        });

        await userAClient.mutate({
            mutation: SetUserCatalogPermissionDocument,
            variables: {
                identifier: {
                    catalogSlug: targetPackageCatalogSlug
                },
                value: [
                    {
                        usernameOrEmailAddress: userBUsername,
                        permission: [Permission.VIEW, Permission.EDIT],
                        packagePermissions: []
                    }
                ],
                message: "Test message"
            }
        });

        await userAClient.mutate({
            mutation: MovePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: inintialPackageCatalogSlug,
                    packageSlug: packageSlug
                },
                catalogIdentifier: {
                    catalogSlug: targetPackageCatalogSlug
                }
            }
        });

        const movedPackage = await userBClient.query({
            query: PackageDocument,
            variables: {
                identifier: {
                    catalogSlug: targetPackageCatalogSlug,
                    packageSlug: packageSlug
                }
            }
        });

        if (!movedPackage.errors || !movedPackage.errors[0]) {
            expect(true).equal(false, "Should've thrown an error");
            return;
        }

        expect(movedPackage.errors[0].message).equal("NOT_AUTHORIZED");
    });

    it("Should make package private if catalog is private", async function () {
        const inintialPackageCatalogSlug = "test-a-move";
        const targetPackageCatalogSlug = "test-a-move-ctg";
        const packageSlug = "test-a-move-prvt";

        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: inintialPackageCatalogSlug,
                    packageSlug: packageSlug,
                    displayName: "Congressional LegislatorsA",
                    description: "Test move of congressional legislatorsA"
                }
            }
        });

        await userAClient.mutate({
            mutation: UpdatePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: inintialPackageCatalogSlug,
                    packageSlug: packageSlug
                },
                value: {
                    isPublic: true
                }
            }
        });

        await userAClient.mutate({
            mutation: MovePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: inintialPackageCatalogSlug,
                    packageSlug: packageSlug
                },
                catalogIdentifier: {
                    catalogSlug: targetPackageCatalogSlug
                }
            }
        });

        const movedPackageResponse = await userAClient.query({
            query: PackageDocument,
            variables: {
                identifier: {
                    catalogSlug: targetPackageCatalogSlug,
                    packageSlug: packageSlug
                }
            }
        });

        const movedPackage = movedPackageResponse.data?.package;
        if (!movedPackage) {
            expect(true).equal(false, "Should've returned the moved package");
            return;
        }

        expect(movedPackage.isPublic).equal(false);
    });

    it("Should keep issues linked to the moved package", async function () {
        const inintialPackageCatalogSlug = "test-a-move";
        const targetPackageCatalogSlug = "test-a-move-ctg";
        const packageSlug = "test-a-move-iss";

        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: inintialPackageCatalogSlug,
                    packageSlug: packageSlug,
                    displayName: "Congressional LegislatorsA",
                    description: "Test move of congressional legislatorsA"
                }
            }
        });

        await userAClient.mutate({
            mutation: CreatePackageIssueDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: inintialPackageCatalogSlug,
                    packageSlug: packageSlug
                },
                issue: {
                    subject: "This is my issue",
                    content: "This is my content"
                }
            }
        });

        await userAClient.mutate({
            mutation: MovePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: inintialPackageCatalogSlug,
                    packageSlug: packageSlug
                },
                catalogIdentifier: {
                    catalogSlug: targetPackageCatalogSlug
                }
            }
        });

        const issuesResponse = await userAClient.query({
            query: PackageIssuesDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: targetPackageCatalogSlug,
                    packageSlug: packageSlug
                },
                includeClosedIssues: true,
                includeOpenIssues: true,
                limit: 1,
                offset: 0,
                orderBy: OrderBy.CREATED_AT
            }
        });

        const issuesBody = issuesResponse.data.packageIssues;
        if (!issuesBody || !issuesBody.issues) {
            expect(true).equal(false, "Should've returned the created package issue");
            return;
        }

        expect(issuesBody.issues.length).equal(1);
    });

    it("Should keep versions linked to the moved package", async function () {
        const inintialPackageCatalogSlug = "test-a-move";
        const targetPackageCatalogSlug = "test-a-move-ctg";
        const packageSlug = "test-a-move-vrs";

        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: inintialPackageCatalogSlug,
                    packageSlug: packageSlug,
                    displayName: "Congressional LegislatorsA",
                    description: "Test move of congressional legislatorsA"
                }
            }
        });

        const packageFileContents = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");
        const packageFileString = JSON.stringify(packageFileContents);

        await userAClient.mutate({
            mutation: CreateVersionDocument,
            variables: {
                identifier: {
                    catalogSlug: inintialPackageCatalogSlug,
                    packageSlug: packageSlug
                },
                value: {
                    packageFile: packageFileString
                }
            }
        });

        await userAClient.mutate({
            mutation: MovePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: inintialPackageCatalogSlug,
                    packageSlug: packageSlug
                },
                catalogIdentifier: {
                    catalogSlug: targetPackageCatalogSlug
                }
            }
        });

        const movedPackageResponse = await userAClient.query({
            query: PackageDocument,
            variables: {
                identifier: {
                    catalogSlug: targetPackageCatalogSlug,
                    packageSlug: packageSlug
                }
            }
        });

        const packageData = movedPackageResponse.data.package;
        if (!packageData || !packageData.versions) {
            expect(true).equal(false, "Should've returned the created package version");
            return;
        }

        expect(packageData.versions.length).equal(1);
    });
});
