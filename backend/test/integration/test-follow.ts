import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";
import { expect } from "chai";
import {
    CreateCatalogDocument,
    CreateCollectionDocument,
    CreatePackageDocument,
    CreatePackageIssueDocument,
    CreateVersionDocument,
    DeleteUserCatalogPermissionsDocument,
    GetFollowDocument,
    NotificationFrequency,
    Permission,
    RemovePackagePermissionsDocument,
    SaveFollowDocument,
    SetPackagePermissionsDocument,
    SetUserCatalogPermissionDocument,
    SetUserCollectionPermissionsDocument,
    UpdateCatalogDocument,
    UpdateCollectionDocument,
    UpdatePackageDocument
} from "./registry-client";
import { createUser } from "./test-utils";
import { loadPackageFileFromDisk } from "datapm-lib";

describe("Follow Tests", async () => {
    const userAUsername = "follow-user-a";
    const userBUsername = "follow-user-b";

    let userAClient: ApolloClient<NormalizedCacheObject>;
    let userBClient: ApolloClient<NormalizedCacheObject>;

    it("Create users A & B", async function () {
        userAClient = await createUser(
            "FirstA",
            "LastA",
            userAUsername,
            userAUsername + "@test.datapm.io",
            "passwordA!"
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
    });

    it("Making public package private removes package and package issues follows of users without permisisons", async function () {
        const catalogSlug = "pub-ctg";
        const packageSlug = "pub-priv-pkg";

        await userAClient.mutate({
            mutation: CreateCatalogDocument,
            variables: {
                value: {
                    slug: catalogSlug,
                    displayName: "User A Second Catalog",
                    description: "This is an integration test User A second catalog",
                    website: "https://usera.datapm.io",
                    isPublic: true
                }
            }
        });

        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: catalogSlug,
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
                    catalogSlug: catalogSlug,
                    packageSlug: packageSlug
                },
                value: {
                    packageFile: packageFileString
                }
            }
        });

        await userAClient.mutate({
            mutation: UpdatePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: catalogSlug,
                    packageSlug: packageSlug
                },
                value: {
                    isPublic: true
                }
            }
        });

        await userAClient.mutate({
            mutation: CreatePackageIssueDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: catalogSlug,
                    packageSlug: packageSlug
                },
                issue: {
                    subject: "This is my issue",
                    content: "This is my content"
                }
            }
        });

        await userBClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    package: {
                        catalogSlug: catalogSlug,
                        packageSlug: packageSlug
                    },
                    notificationFrequency: NotificationFrequency.DAILY
                }
            }
        });

        await userBClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    packageIssue: {
                        packageIdentifier: {
                            catalogSlug: catalogSlug,
                            packageSlug: packageSlug
                        },
                        issueNumber: 0
                    },
                    notificationFrequency: NotificationFrequency.DAILY
                }
            }
        });

        const existingFollow = await userBClient.query({
            query: GetFollowDocument,
            variables: {
                follow: {
                    package: {
                        catalogSlug: catalogSlug,
                        packageSlug: packageSlug
                    }
                }
            }
        });

        const existingIssueFollow = await userBClient.query({
            query: GetFollowDocument,
            variables: {
                follow: {
                    packageIssue: {
                        packageIdentifier: {
                            catalogSlug: catalogSlug,
                            packageSlug: packageSlug
                        },
                        issueNumber: 0
                    }
                }
            }
        });

        expect(existingFollow.data.getFollow != null).equal(true);
        expect(existingFollow.errors == null).equal(true);

        expect(existingIssueFollow.data.getFollow != null).equal(true);
        expect(existingIssueFollow.errors == null).equal(true);

        await userAClient.mutate({
            mutation: UpdatePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: catalogSlug,
                    packageSlug: packageSlug
                },
                value: {
                    isPublic: false
                }
            }
        });

        const deletedFollow = await userBClient.query({
            query: GetFollowDocument,
            variables: {
                follow: {
                    package: {
                        catalogSlug: catalogSlug,
                        packageSlug: packageSlug
                    }
                }
            }
        });

        const deletedIssueFollow = await userBClient.query({
            query: GetFollowDocument,
            variables: {
                follow: {
                    packageIssue: {
                        packageIdentifier: {
                            catalogSlug: catalogSlug,
                            packageSlug: packageSlug
                        },
                        issueNumber: 0
                    }
                }
            }
        });

        expect(deletedFollow.data.getFollow == null).equal(true);
        expect(deletedIssueFollow.data.getFollow == null).equal(true);
    });

    it("Making public catalog private removes catalog, package and package issues follows of users without permisisons", async function () {
        const catalogSlug = "pub-pr-ctg";
        const packageSlug = "pkgpkg";

        await userAClient.mutate({
            mutation: CreateCatalogDocument,
            variables: {
                value: {
                    slug: catalogSlug,
                    displayName: "User A Second Catalog",
                    description: "This is an integration test User A second catalog",
                    website: "https://usera.datapm.io",
                    isPublic: true
                }
            }
        });

        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: catalogSlug,
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
                    catalogSlug: catalogSlug,
                    packageSlug: packageSlug
                },
                value: {
                    packageFile: packageFileString
                }
            }
        });

        await userAClient.mutate({
            mutation: UpdatePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: catalogSlug,
                    packageSlug: packageSlug
                },
                value: {
                    isPublic: true
                }
            }
        });

        await userAClient.mutate({
            mutation: CreatePackageIssueDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: catalogSlug,
                    packageSlug: packageSlug
                },
                issue: {
                    subject: "This is my issue",
                    content: "This is my content"
                }
            }
        });

        await userBClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    package: {
                        catalogSlug: catalogSlug,
                        packageSlug: packageSlug
                    },
                    notificationFrequency: NotificationFrequency.DAILY
                }
            }
        });

        await userBClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    catalog: {
                        catalogSlug: catalogSlug
                    },
                    notificationFrequency: NotificationFrequency.DAILY
                }
            }
        });

        await userBClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    packageIssue: {
                        packageIdentifier: {
                            catalogSlug: catalogSlug,
                            packageSlug: packageSlug
                        },
                        issueNumber: 0
                    },
                    notificationFrequency: NotificationFrequency.DAILY
                }
            }
        });

        const existingFollow = await userBClient.query({
            query: GetFollowDocument,
            variables: {
                follow: {
                    package: {
                        catalogSlug: catalogSlug,
                        packageSlug: packageSlug
                    }
                }
            }
        });

        const existingIssueFollow = await userBClient.query({
            query: GetFollowDocument,
            variables: {
                follow: {
                    packageIssue: {
                        packageIdentifier: {
                            catalogSlug: catalogSlug,
                            packageSlug: packageSlug
                        },
                        issueNumber: 0
                    }
                }
            }
        });

        const existingCatalogFollow = await userBClient.query({
            query: GetFollowDocument,
            variables: {
                follow: {
                    catalog: {
                        catalogSlug: catalogSlug
                    }
                }
            }
        });

        expect(existingFollow.data.getFollow != null).equal(true);
        expect(existingFollow.errors == null).equal(true);

        expect(existingIssueFollow.data.getFollow != null).equal(true);
        expect(existingIssueFollow.errors == null).equal(true);

        expect(existingCatalogFollow.data.getFollow != null).equal(true);
        expect(existingCatalogFollow.errors == null).equal(true);

        await userAClient.mutate({
            mutation: UpdateCatalogDocument,
            variables: {
                identifier: {
                    catalogSlug: catalogSlug
                },
                value: {
                    isPublic: false
                }
            }
        });

        const deletedFollow = await userBClient.query({
            query: GetFollowDocument,
            variables: {
                follow: {
                    package: {
                        catalogSlug: catalogSlug,
                        packageSlug: packageSlug
                    }
                }
            }
        });

        const deletedIssueFollow = await userBClient.query({
            query: GetFollowDocument,
            variables: {
                follow: {
                    packageIssue: {
                        packageIdentifier: {
                            catalogSlug: catalogSlug,
                            packageSlug: packageSlug
                        },
                        issueNumber: 0
                    }
                }
            }
        });

        const deletedCatalogFollow = await userBClient.query({
            query: GetFollowDocument,
            variables: {
                follow: {
                    catalog: {
                        catalogSlug: catalogSlug
                    }
                }
            }
        });

        expect(deletedFollow.data.getFollow == null).equal(true);
        expect(deletedIssueFollow.data.getFollow == null).equal(true);
        expect(deletedCatalogFollow.data.getFollow == null).equal(true);
    });

    it("Making public package private keeps package and package issues follows of users with permisisons", async function () {
        const catalogSlug = "abc-pub-ctg";
        const packageSlug = "pub-priv-pkg";

        await userAClient.mutate({
            mutation: CreateCatalogDocument,
            variables: {
                value: {
                    slug: catalogSlug,
                    displayName: "User A Second Catalog",
                    description: "This is an integration test User A second catalog",
                    website: "https://usera.datapm.io",
                    isPublic: true
                }
            }
        });

        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: catalogSlug,
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
                    catalogSlug: catalogSlug,
                    packageSlug: packageSlug
                },
                value: {
                    packageFile: packageFileString
                }
            }
        });

        await userAClient.mutate({
            mutation: UpdatePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: catalogSlug,
                    packageSlug: packageSlug
                },
                value: {
                    isPublic: true
                }
            }
        });

        await userAClient.mutate({
            mutation: CreatePackageIssueDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: catalogSlug,
                    packageSlug: packageSlug
                },
                issue: {
                    subject: "This is my issue",
                    content: "This is my content"
                }
            }
        });

        await userAClient.mutate({
            mutation: SetPackagePermissionsDocument,
            variables: {
                identifier: {
                    catalogSlug: catalogSlug,
                    packageSlug: packageSlug
                },
                value: [
                    {
                        usernameOrEmailAddress: userBUsername,
                        permissions: [Permission.VIEW]
                    }
                ],
                message: "Testing test"
            }
        });

        await userBClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    package: {
                        catalogSlug: catalogSlug,
                        packageSlug: packageSlug
                    },
                    notificationFrequency: NotificationFrequency.DAILY
                }
            }
        });

        await userBClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    packageIssue: {
                        packageIdentifier: {
                            catalogSlug: catalogSlug,
                            packageSlug: packageSlug
                        },
                        issueNumber: 0
                    },
                    notificationFrequency: NotificationFrequency.DAILY
                }
            }
        });

        const existingFollow = await userBClient.query({
            query: GetFollowDocument,
            variables: {
                follow: {
                    package: {
                        catalogSlug: catalogSlug,
                        packageSlug: packageSlug
                    }
                }
            }
        });

        const existingIssueFollow = await userBClient.query({
            query: GetFollowDocument,
            variables: {
                follow: {
                    packageIssue: {
                        packageIdentifier: {
                            catalogSlug: catalogSlug,
                            packageSlug: packageSlug
                        },
                        issueNumber: 0
                    }
                }
            }
        });

        expect(existingFollow.data.getFollow != null).equal(true);
        expect(existingFollow.errors == null).equal(true);

        expect(existingIssueFollow.data.getFollow != null).equal(true);
        expect(existingIssueFollow.errors == null).equal(true);

        await userAClient.mutate({
            mutation: UpdatePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: catalogSlug,
                    packageSlug: packageSlug
                },
                value: {
                    isPublic: false
                }
            }
        });

        const deletedFollow = await userBClient.query({
            query: GetFollowDocument,
            variables: {
                follow: {
                    package: {
                        catalogSlug: catalogSlug,
                        packageSlug: packageSlug
                    }
                }
            }
        });

        const deletedIssueFollow = await userBClient.query({
            query: GetFollowDocument,
            variables: {
                follow: {
                    packageIssue: {
                        packageIdentifier: {
                            catalogSlug: catalogSlug,
                            packageSlug: packageSlug
                        },
                        issueNumber: 0
                    }
                }
            }
        });

        expect(deletedFollow.data.getFollow != null).equal(true);
        expect(deletedIssueFollow.data.getFollow != null).equal(true);
    });

    it("Making public catalog private keeps catalog, package and package issues follows of users with permisisons", async function () {
        const catalogSlug = "abc-pubz-ctg";
        const packageSlug = "pub-priv-pkg";

        await userAClient.mutate({
            mutation: CreateCatalogDocument,
            variables: {
                value: {
                    slug: catalogSlug,
                    displayName: "User A Second Catalog",
                    description: "This is an integration test User A second catalog",
                    website: "https://usera.datapm.io",
                    isPublic: true
                }
            }
        });

        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: catalogSlug,
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
                    catalogSlug: catalogSlug,
                    packageSlug: packageSlug
                },
                value: {
                    packageFile: packageFileString
                }
            }
        });

        await userAClient.mutate({
            mutation: UpdatePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: catalogSlug,
                    packageSlug: packageSlug
                },
                value: {
                    isPublic: true
                }
            }
        });

        await userAClient.mutate({
            mutation: CreatePackageIssueDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: catalogSlug,
                    packageSlug: packageSlug
                },
                issue: {
                    subject: "This is my issue",
                    content: "This is my content"
                }
            }
        });

        await userAClient.mutate({
            mutation: SetPackagePermissionsDocument,
            variables: {
                identifier: {
                    catalogSlug: catalogSlug,
                    packageSlug: packageSlug
                },
                value: [
                    {
                        usernameOrEmailAddress: userBUsername,
                        permissions: [Permission.VIEW]
                    }
                ],
                message: "Testing test"
            }
        });

        await userBClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    package: {
                        catalogSlug: catalogSlug,
                        packageSlug: packageSlug
                    },
                    notificationFrequency: NotificationFrequency.DAILY
                }
            }
        });

        await userBClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    packageIssue: {
                        packageIdentifier: {
                            catalogSlug: catalogSlug,
                            packageSlug: packageSlug
                        },
                        issueNumber: 0
                    },
                    notificationFrequency: NotificationFrequency.DAILY
                }
            }
        });

        const existingFollow = await userBClient.query({
            query: GetFollowDocument,
            variables: {
                follow: {
                    package: {
                        catalogSlug: catalogSlug,
                        packageSlug: packageSlug
                    }
                }
            }
        });

        const existingIssueFollow = await userBClient.query({
            query: GetFollowDocument,
            variables: {
                follow: {
                    packageIssue: {
                        packageIdentifier: {
                            catalogSlug: catalogSlug,
                            packageSlug: packageSlug
                        },
                        issueNumber: 0
                    }
                }
            }
        });

        expect(existingFollow.data.getFollow != null).equal(true);
        expect(existingFollow.errors == null).equal(true);

        expect(existingIssueFollow.data.getFollow != null).equal(true);
        expect(existingIssueFollow.errors == null).equal(true);

        await userAClient.mutate({
            mutation: UpdatePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: catalogSlug,
                    packageSlug: packageSlug
                },
                value: {
                    isPublic: false
                }
            }
        });

        const deletedFollow = await userBClient.query({
            query: GetFollowDocument,
            variables: {
                follow: {
                    package: {
                        catalogSlug: catalogSlug,
                        packageSlug: packageSlug
                    }
                }
            }
        });

        const deletedIssueFollow = await userBClient.query({
            query: GetFollowDocument,
            variables: {
                follow: {
                    packageIssue: {
                        packageIdentifier: {
                            catalogSlug: catalogSlug,
                            packageSlug: packageSlug
                        },
                        issueNumber: 0
                    }
                }
            }
        });

        expect(deletedFollow.data.getFollow != null).equal(true);
        expect(deletedIssueFollow.data.getFollow != null).equal(true);
    });

    it("Removing user permissions from public package doesnt remove users package and package issues follows", async function () {
        const catalogSlug = "ant-pub-ctg";
        const packageSlug = "rmv-prm-pkg";

        await userAClient.mutate({
            mutation: CreateCatalogDocument,
            variables: {
                value: {
                    slug: catalogSlug,
                    displayName: "User A Second Catalog",
                    description: "This is an integration test User A second catalog",
                    website: "https://usera.datapm.io",
                    isPublic: true
                }
            }
        });

        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: catalogSlug,
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
                    catalogSlug: catalogSlug,
                    packageSlug: packageSlug
                },
                value: {
                    packageFile: packageFileString
                }
            }
        });

        await userAClient.mutate({
            mutation: UpdatePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: catalogSlug,
                    packageSlug: packageSlug
                },
                value: {
                    isPublic: true
                }
            }
        });

        await userAClient.mutate({
            mutation: CreatePackageIssueDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: catalogSlug,
                    packageSlug: packageSlug
                },
                issue: {
                    subject: "This is my issue",
                    content: "This is my content"
                }
            }
        });

        await userAClient.mutate({
            mutation: SetPackagePermissionsDocument,
            variables: {
                identifier: {
                    catalogSlug: catalogSlug,
                    packageSlug: packageSlug
                },
                value: [
                    {
                        usernameOrEmailAddress: userBUsername,
                        permissions: [Permission.VIEW]
                    }
                ],
                message: "Testing test"
            }
        });

        await userBClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    package: {
                        catalogSlug: catalogSlug,
                        packageSlug: packageSlug
                    },
                    notificationFrequency: NotificationFrequency.DAILY
                }
            }
        });

        await userBClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    packageIssue: {
                        packageIdentifier: {
                            catalogSlug: catalogSlug,
                            packageSlug: packageSlug
                        },
                        issueNumber: 0
                    },
                    notificationFrequency: NotificationFrequency.DAILY
                }
            }
        });

        const existingFollow = await userBClient.query({
            query: GetFollowDocument,
            variables: {
                follow: {
                    package: {
                        catalogSlug: catalogSlug,
                        packageSlug: packageSlug
                    }
                }
            }
        });

        const existingIssueFollow = await userBClient.query({
            query: GetFollowDocument,
            variables: {
                follow: {
                    packageIssue: {
                        packageIdentifier: {
                            catalogSlug: catalogSlug,
                            packageSlug: packageSlug
                        },
                        issueNumber: 0
                    }
                }
            }
        });

        expect(existingFollow.data.getFollow != null).equal(true);
        expect(existingFollow.errors == null).equal(true);

        expect(existingIssueFollow.data.getFollow != null).equal(true);
        expect(existingIssueFollow.errors == null).equal(true);

        await userAClient.mutate({
            mutation: RemovePackagePermissionsDocument,
            variables: {
                identifier: {
                    catalogSlug: catalogSlug,
                    packageSlug: packageSlug
                },
                usernameOrEmailAddress: userBUsername
            }
        });

        const deletedFollow = await userBClient.query({
            query: GetFollowDocument,
            variables: {
                follow: {
                    package: {
                        catalogSlug: catalogSlug,
                        packageSlug: packageSlug
                    }
                }
            }
        });

        const deletedIssueFollow = await userBClient.query({
            query: GetFollowDocument,
            variables: {
                follow: {
                    packageIssue: {
                        packageIdentifier: {
                            catalogSlug: catalogSlug,
                            packageSlug: packageSlug
                        },
                        issueNumber: 0
                    }
                }
            }
        });

        expect(deletedFollow.data.getFollow != null).equal(true);
        expect(deletedIssueFollow.data.getFollow != null).equal(true);
    });

    it("Removing user permissions from public catalog doesnt remove users catalog, package and package issues follows", async function () {
        const catalogSlug = "akg-pub-ctg";
        const packageSlug = "rmv-prm-pkg";

        await userAClient.mutate({
            mutation: CreateCatalogDocument,
            variables: {
                value: {
                    slug: catalogSlug,
                    displayName: "User A Second Catalog",
                    description: "This is an integration test User A second catalog",
                    website: "https://usera.datapm.io",
                    isPublic: true
                }
            }
        });

        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: catalogSlug,
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
                    catalogSlug: catalogSlug,
                    packageSlug: packageSlug
                },
                value: {
                    packageFile: packageFileString
                }
            }
        });

        await userAClient.mutate({
            mutation: UpdatePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: catalogSlug,
                    packageSlug: packageSlug
                },
                value: {
                    isPublic: true
                }
            }
        });

        await userAClient.mutate({
            mutation: CreatePackageIssueDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: catalogSlug,
                    packageSlug: packageSlug
                },
                issue: {
                    subject: "This is my issue",
                    content: "This is my content"
                }
            }
        });

        await userAClient.mutate({
            mutation: SetUserCatalogPermissionDocument,
            variables: {
                identifier: {
                    catalogSlug: catalogSlug
                },
                value: [
                    {
                        usernameOrEmailAddress: userBUsername,
                        permission: [Permission.VIEW],
                        packagePermissions: [Permission.VIEW]
                    }
                ],
                message: "Testing test"
            }
        });

        await userBClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    package: {
                        catalogSlug: catalogSlug,
                        packageSlug: packageSlug
                    },
                    notificationFrequency: NotificationFrequency.DAILY
                }
            }
        });

        await userBClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    packageIssue: {
                        packageIdentifier: {
                            catalogSlug: catalogSlug,
                            packageSlug: packageSlug
                        },
                        issueNumber: 0
                    },
                    notificationFrequency: NotificationFrequency.DAILY
                }
            }
        });

        await userBClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    catalog: {
                        catalogSlug: catalogSlug
                    },
                    notificationFrequency: NotificationFrequency.DAILY
                }
            }
        });

        const existingFollow = await userBClient.query({
            query: GetFollowDocument,
            variables: {
                follow: {
                    package: {
                        catalogSlug: catalogSlug,
                        packageSlug: packageSlug
                    }
                }
            }
        });

        const existingIssueFollow = await userBClient.query({
            query: GetFollowDocument,
            variables: {
                follow: {
                    packageIssue: {
                        packageIdentifier: {
                            catalogSlug: catalogSlug,
                            packageSlug: packageSlug
                        },
                        issueNumber: 0
                    }
                }
            }
        });

        const existingCatalogFollow = await userBClient.query({
            query: GetFollowDocument,
            variables: {
                follow: {
                    catalog: {
                        catalogSlug: catalogSlug
                    }
                }
            }
        });

        expect(existingFollow.data.getFollow != null).equal(true);
        expect(existingFollow.errors == null).equal(true);

        expect(existingIssueFollow.data.getFollow != null).equal(true);
        expect(existingIssueFollow.errors == null).equal(true);

        expect(existingCatalogFollow.data.getFollow != null).equal(true);
        expect(existingCatalogFollow.errors == null).equal(true);

        await userAClient.mutate({
            mutation: DeleteUserCatalogPermissionsDocument,
            variables: {
                identifier: {
                    catalogSlug: catalogSlug
                },
                usernameOrEmailAddress: userBUsername
            }
        });

        const deletedFollow = await userBClient.query({
            query: GetFollowDocument,
            variables: {
                follow: {
                    package: {
                        catalogSlug: catalogSlug,
                        packageSlug: packageSlug
                    }
                }
            }
        });

        const deletedIssueFollow = await userBClient.query({
            query: GetFollowDocument,
            variables: {
                follow: {
                    packageIssue: {
                        packageIdentifier: {
                            catalogSlug: catalogSlug,
                            packageSlug: packageSlug
                        },
                        issueNumber: 0
                    }
                }
            }
        });

        const deletedCatalogFollow = await userBClient.query({
            query: GetFollowDocument,
            variables: {
                follow: {
                    catalog: {
                        catalogSlug: catalogSlug
                    }
                }
            }
        });

        expect(deletedFollow.data.getFollow != null).equal(true);
        expect(deletedIssueFollow.data.getFollow != null).equal(true);
        expect(deletedCatalogFollow.data.getFollow != null).equal(true);
    });

    it("Setting empty user permissions from public package doesnt remove users package and package issues follows", async function () {
        const catalogSlug = "sdw-pub-ctg";
        const packageSlug = "rmv-prm-pkg";

        await userAClient.mutate({
            mutation: CreateCatalogDocument,
            variables: {
                value: {
                    slug: catalogSlug,
                    displayName: "User A Second Catalog",
                    description: "This is an integration test User A second catalog",
                    website: "https://usera.datapm.io",
                    isPublic: true
                }
            }
        });

        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: catalogSlug,
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
                    catalogSlug: catalogSlug,
                    packageSlug: packageSlug
                },
                value: {
                    packageFile: packageFileString
                }
            }
        });

        await userAClient.mutate({
            mutation: UpdatePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: catalogSlug,
                    packageSlug: packageSlug
                },
                value: {
                    isPublic: true
                }
            }
        });

        await userAClient.mutate({
            mutation: CreatePackageIssueDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: catalogSlug,
                    packageSlug: packageSlug
                },
                issue: {
                    subject: "This is my issue",
                    content: "This is my content"
                }
            }
        });

        await userAClient.mutate({
            mutation: SetPackagePermissionsDocument,
            variables: {
                identifier: {
                    catalogSlug: catalogSlug,
                    packageSlug: packageSlug
                },
                value: [
                    {
                        usernameOrEmailAddress: userBUsername,
                        permissions: [Permission.VIEW]
                    }
                ],
                message: "Testing test"
            }
        });

        await userBClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    package: {
                        catalogSlug: catalogSlug,
                        packageSlug: packageSlug
                    },
                    notificationFrequency: NotificationFrequency.DAILY
                }
            }
        });

        await userBClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    packageIssue: {
                        packageIdentifier: {
                            catalogSlug: catalogSlug,
                            packageSlug: packageSlug
                        },
                        issueNumber: 0
                    },
                    notificationFrequency: NotificationFrequency.DAILY
                }
            }
        });

        const existingFollow = await userBClient.query({
            query: GetFollowDocument,
            variables: {
                follow: {
                    package: {
                        catalogSlug: catalogSlug,
                        packageSlug: packageSlug
                    }
                }
            }
        });

        const existingIssueFollow = await userBClient.query({
            query: GetFollowDocument,
            variables: {
                follow: {
                    packageIssue: {
                        packageIdentifier: {
                            catalogSlug: catalogSlug,
                            packageSlug: packageSlug
                        },
                        issueNumber: 0
                    }
                }
            }
        });

        expect(existingFollow.data.getFollow != null).equal(true);
        expect(existingFollow.errors == null).equal(true);

        expect(existingIssueFollow.data.getFollow != null).equal(true);
        expect(existingIssueFollow.errors == null).equal(true);

        await userAClient.mutate({
            mutation: SetPackagePermissionsDocument,
            variables: {
                identifier: {
                    catalogSlug: catalogSlug,
                    packageSlug: packageSlug
                },
                value: [
                    {
                        usernameOrEmailAddress: userBUsername,
                        permissions: []
                    }
                ],
                message: "Testing test"
            }
        });

        const deletedFollow = await userBClient.query({
            query: GetFollowDocument,
            variables: {
                follow: {
                    package: {
                        catalogSlug: catalogSlug,
                        packageSlug: packageSlug
                    }
                }
            }
        });

        const deletedIssueFollow = await userBClient.query({
            query: GetFollowDocument,
            variables: {
                follow: {
                    packageIssue: {
                        packageIdentifier: {
                            catalogSlug: catalogSlug,
                            packageSlug: packageSlug
                        },
                        issueNumber: 0
                    }
                }
            }
        });

        expect(deletedFollow.data.getFollow != null).equal(true);
        expect(deletedIssueFollow.data.getFollow != null).equal(true);
    });

    it("Removing user permissions from private package removes users package and package issues follows", async function () {
        const catalogSlug = "add-pub-ctg";
        const packageSlug = "rmv-prm-pkg";

        await userAClient.mutate({
            mutation: CreateCatalogDocument,
            variables: {
                value: {
                    slug: catalogSlug,
                    displayName: "User A Second Catalog",
                    description: "This is an integration test User A second catalog",
                    website: "https://usera.datapm.io",
                    isPublic: true
                }
            }
        });

        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: catalogSlug,
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
                    catalogSlug: catalogSlug,
                    packageSlug: packageSlug
                },
                value: {
                    packageFile: packageFileString
                }
            }
        });

        await userAClient.mutate({
            mutation: CreatePackageIssueDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: catalogSlug,
                    packageSlug: packageSlug
                },
                issue: {
                    subject: "This is my issue",
                    content: "This is my content"
                }
            }
        });

        await userAClient.mutate({
            mutation: SetPackagePermissionsDocument,
            variables: {
                identifier: {
                    catalogSlug: catalogSlug,
                    packageSlug: packageSlug
                },
                value: [
                    {
                        usernameOrEmailAddress: userBUsername,
                        permissions: [Permission.VIEW]
                    }
                ],
                message: "Testing test"
            }
        });

        await userBClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    package: {
                        catalogSlug: catalogSlug,
                        packageSlug: packageSlug
                    },
                    notificationFrequency: NotificationFrequency.DAILY
                }
            }
        });

        await userBClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    packageIssue: {
                        packageIdentifier: {
                            catalogSlug: catalogSlug,
                            packageSlug: packageSlug
                        },
                        issueNumber: 0
                    },
                    notificationFrequency: NotificationFrequency.DAILY
                }
            }
        });

        const existingFollow = await userBClient.query({
            query: GetFollowDocument,
            variables: {
                follow: {
                    package: {
                        catalogSlug: catalogSlug,
                        packageSlug: packageSlug
                    }
                }
            }
        });

        const existingIssueFollow = await userBClient.query({
            query: GetFollowDocument,
            variables: {
                follow: {
                    packageIssue: {
                        packageIdentifier: {
                            catalogSlug: catalogSlug,
                            packageSlug: packageSlug
                        },
                        issueNumber: 0
                    }
                }
            }
        });

        expect(existingFollow.data.getFollow != null).equal(true);
        expect(existingFollow.errors == null).equal(true);

        expect(existingIssueFollow.data.getFollow != null).equal(true);
        expect(existingIssueFollow.errors == null).equal(true);

        await userAClient.mutate({
            mutation: RemovePackagePermissionsDocument,
            variables: {
                identifier: {
                    catalogSlug: catalogSlug,
                    packageSlug: packageSlug
                },
                usernameOrEmailAddress: userBUsername
            }
        });

        const deletedFollow = await userBClient.query({
            query: GetFollowDocument,
            variables: {
                follow: {
                    package: {
                        catalogSlug: catalogSlug,
                        packageSlug: packageSlug
                    }
                }
            }
        });

        const deletedIssueFollow = await userBClient.query({
            query: GetFollowDocument,
            variables: {
                follow: {
                    packageIssue: {
                        packageIdentifier: {
                            catalogSlug: catalogSlug,
                            packageSlug: packageSlug
                        },
                        issueNumber: 0
                    }
                }
            }
        });

        expect(deletedFollow.data.getFollow == null).equal(true);
        expect(deletedIssueFollow.data.getFollow == null).equal(true);
    });

    it("Setting user permissions to empty from private package removes users package and package issues follows", async function () {
        const catalogSlug = "dwa-pub-ctg";
        const packageSlug = "rmv-prm-pkg";

        await userAClient.mutate({
            mutation: CreateCatalogDocument,
            variables: {
                value: {
                    slug: catalogSlug,
                    displayName: "User A Second Catalog",
                    description: "This is an integration test User A second catalog",
                    website: "https://usera.datapm.io",
                    isPublic: true
                }
            }
        });

        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: catalogSlug,
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
                    catalogSlug: catalogSlug,
                    packageSlug: packageSlug
                },
                value: {
                    packageFile: packageFileString
                }
            }
        });

        await userAClient.mutate({
            mutation: CreatePackageIssueDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: catalogSlug,
                    packageSlug: packageSlug
                },
                issue: {
                    subject: "This is my issue",
                    content: "This is my content"
                }
            }
        });

        await userAClient.mutate({
            mutation: SetPackagePermissionsDocument,
            variables: {
                identifier: {
                    catalogSlug: catalogSlug,
                    packageSlug: packageSlug
                },
                value: [
                    {
                        usernameOrEmailAddress: userBUsername,
                        permissions: [Permission.VIEW]
                    }
                ],
                message: "Testing test"
            }
        });

        await userBClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    package: {
                        catalogSlug: catalogSlug,
                        packageSlug: packageSlug
                    },
                    notificationFrequency: NotificationFrequency.DAILY
                }
            }
        });

        await userBClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    packageIssue: {
                        packageIdentifier: {
                            catalogSlug: catalogSlug,
                            packageSlug: packageSlug
                        },
                        issueNumber: 0
                    },
                    notificationFrequency: NotificationFrequency.DAILY
                }
            }
        });

        const existingFollow = await userBClient.query({
            query: GetFollowDocument,
            variables: {
                follow: {
                    package: {
                        catalogSlug: catalogSlug,
                        packageSlug: packageSlug
                    }
                }
            }
        });

        const existingIssueFollow = await userBClient.query({
            query: GetFollowDocument,
            variables: {
                follow: {
                    packageIssue: {
                        packageIdentifier: {
                            catalogSlug: catalogSlug,
                            packageSlug: packageSlug
                        },
                        issueNumber: 0
                    }
                }
            }
        });

        expect(existingFollow.data.getFollow != null).equal(true);
        expect(existingFollow.errors == null).equal(true);

        expect(existingIssueFollow.data.getFollow != null).equal(true);
        expect(existingIssueFollow.errors == null).equal(true);

        await userAClient.mutate({
            mutation: SetPackagePermissionsDocument,
            variables: {
                identifier: {
                    catalogSlug: catalogSlug,
                    packageSlug: packageSlug
                },
                value: [
                    {
                        usernameOrEmailAddress: userBUsername,
                        permissions: []
                    }
                ],
                message: "Testing test"
            }
        });

        const deletedFollow = await userBClient.query({
            query: GetFollowDocument,
            variables: {
                follow: {
                    package: {
                        catalogSlug: catalogSlug,
                        packageSlug: packageSlug
                    }
                }
            }
        });

        const deletedIssueFollow = await userBClient.query({
            query: GetFollowDocument,
            variables: {
                follow: {
                    packageIssue: {
                        packageIdentifier: {
                            catalogSlug: catalogSlug,
                            packageSlug: packageSlug
                        },
                        issueNumber: 0
                    }
                }
            }
        });

        expect(deletedFollow.data.getFollow == null).equal(true);
        expect(deletedIssueFollow.data.getFollow == null).equal(true);
    });

    it("Making public collection private removes collection follows of users without permisisons", async function () {
        const collectionSlug = "usr-col";

        await userAClient.mutate({
            mutation: CreateCollectionDocument,
            variables: {
                value: {
                    collectionSlug: collectionSlug,
                    name: "test b collection",
                    description: "Short test",
                    isPublic: true
                }
            }
        });

        await userBClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    collection: {
                        collectionSlug: collectionSlug
                    },
                    notificationFrequency: NotificationFrequency.DAILY
                }
            }
        });

        const existingFollow = await userBClient.query({
            query: GetFollowDocument,
            variables: {
                follow: {
                    collection: {
                        collectionSlug: collectionSlug
                    }
                }
            }
        });

        expect(existingFollow.data.getFollow != null).equal(true);
        expect(existingFollow.errors == null).equal(true);

        await userAClient.mutate({
            mutation: UpdateCollectionDocument,
            variables: {
                identifier: {
                    collectionSlug: collectionSlug
                },
                value: {
                    isPublic: false
                }
            }
        });

        const deletedFollow = await userBClient.query({
            query: GetFollowDocument,
            variables: {
                follow: {
                    collection: {
                        collectionSlug: collectionSlug
                    }
                }
            }
        });

        expect(deletedFollow.data.getFollow == null).equal(true);
    });

    it("Making public collection private keeps collection follows of users with permisisons", async function () {
        const collectionSlug = "usr-colyy";

        await userAClient.mutate({
            mutation: CreateCollectionDocument,
            variables: {
                value: {
                    collectionSlug: collectionSlug,
                    name: "test b collection",
                    description: "Short test",
                    isPublic: true
                }
            }
        });

        await userBClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    collection: {
                        collectionSlug: collectionSlug
                    },
                    notificationFrequency: NotificationFrequency.DAILY
                }
            }
        });

        const existingFollow = await userBClient.query({
            query: GetFollowDocument,
            variables: {
                follow: {
                    collection: {
                        collectionSlug: collectionSlug
                    }
                }
            }
        });

        expect(existingFollow.data.getFollow != null).equal(true);
        expect(existingFollow.errors == null).equal(true);

        await userAClient.mutate({
            mutation: SetUserCollectionPermissionsDocument,
            variables: {
                identifier: {
                    collectionSlug
                },
                value: [
                    {
                        usernameOrEmailAddress: userBUsername,
                        permissions: [Permission.VIEW]
                    }
                ],
                message: "Test"
            }
        });

        await userAClient.mutate({
            mutation: UpdateCollectionDocument,
            variables: {
                identifier: {
                    collectionSlug: collectionSlug
                },
                value: {
                    isPublic: false
                }
            }
        });

        const deletedFollow = await userBClient.query({
            query: GetFollowDocument,
            variables: {
                follow: {
                    collection: {
                        collectionSlug: collectionSlug
                    }
                }
            }
        });

        expect(deletedFollow.data.getFollow != null).equal(true);
    });

    it("Making public collection private removes collection follows of users without permisisons", async function () {
        const collectionSlug = "usr-cola";

        await userAClient.mutate({
            mutation: CreateCollectionDocument,
            variables: {
                value: {
                    collectionSlug: collectionSlug,
                    name: "test b collection",
                    description: "Short test",
                    isPublic: true
                }
            }
        });

        await userBClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    collection: {
                        collectionSlug: collectionSlug
                    },
                    notificationFrequency: NotificationFrequency.DAILY
                }
            }
        });

        const existingFollow = await userBClient.query({
            query: GetFollowDocument,
            variables: {
                follow: {
                    collection: {
                        collectionSlug: collectionSlug
                    }
                }
            }
        });

        expect(existingFollow.data.getFollow != null).equal(true);
        expect(existingFollow.errors == null).equal(true);

        await userAClient.mutate({
            mutation: UpdateCollectionDocument,
            variables: {
                identifier: {
                    collectionSlug: collectionSlug
                },
                value: {
                    isPublic: false
                }
            }
        });

        const deletedFollow = await userBClient.query({
            query: GetFollowDocument,
            variables: {
                follow: {
                    collection: {
                        collectionSlug: collectionSlug
                    }
                }
            }
        });

        expect(deletedFollow.data.getFollow == null).equal(true);
    });

    it("Removing user permissions from private collection removes collection follows", async function () {
        const collectionSlug = "usr-colz";

        await userAClient.mutate({
            mutation: CreateCollectionDocument,
            variables: {
                value: {
                    collectionSlug: collectionSlug,
                    name: "test b collection",
                    description: "Short test",
                    isPublic: false
                }
            }
        });

        await userAClient.mutate({
            mutation: SetUserCollectionPermissionsDocument,
            variables: {
                identifier: {
                    collectionSlug
                },
                value: [
                    {
                        usernameOrEmailAddress: userBUsername,
                        permissions: [Permission.VIEW]
                    }
                ],
                message: "Test"
            }
        });

        await userBClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    collection: {
                        collectionSlug: collectionSlug
                    },
                    notificationFrequency: NotificationFrequency.DAILY
                }
            }
        });

        const existingFollow = await userBClient.query({
            query: GetFollowDocument,
            variables: {
                follow: {
                    collection: {
                        collectionSlug: collectionSlug
                    }
                }
            }
        });

        expect(existingFollow.data.getFollow != null).equal(true);
        expect(existingFollow.errors == null).equal(true);

        await userAClient.mutate({
            mutation: SetUserCollectionPermissionsDocument,
            variables: {
                identifier: {
                    collectionSlug
                },
                value: [
                    {
                        usernameOrEmailAddress: userBUsername,
                        permissions: []
                    }
                ],
                message: "Test"
            }
        });

        const deletedFollow = await userBClient.query({
            query: GetFollowDocument,
            variables: {
                follow: {
                    collection: {
                        collectionSlug: collectionSlug
                    }
                }
            }
        });

        expect(deletedFollow.data.getFollow == null).equal(true);
    });

    it("Removing user permissions from public collection keeps collection follows", async function () {
        const collectionSlug = "usr-colx";

        await userAClient.mutate({
            mutation: CreateCollectionDocument,
            variables: {
                value: {
                    collectionSlug: collectionSlug,
                    name: "test b collection",
                    description: "Short test",
                    isPublic: true
                }
            }
        });

        await userAClient.mutate({
            mutation: SetUserCollectionPermissionsDocument,
            variables: {
                identifier: {
                    collectionSlug
                },
                value: [
                    {
                        usernameOrEmailAddress: userBUsername,
                        permissions: [Permission.VIEW]
                    }
                ],
                message: "Test"
            }
        });

        await userBClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    collection: {
                        collectionSlug: collectionSlug
                    },
                    notificationFrequency: NotificationFrequency.DAILY
                }
            }
        });

        const existingFollow = await userBClient.query({
            query: GetFollowDocument,
            variables: {
                follow: {
                    collection: {
                        collectionSlug: collectionSlug
                    }
                }
            }
        });

        expect(existingFollow.data.getFollow != null).equal(true);
        expect(existingFollow.errors == null).equal(true);

        await userAClient.mutate({
            mutation: SetUserCollectionPermissionsDocument,
            variables: {
                identifier: {
                    collectionSlug
                },
                value: [
                    {
                        usernameOrEmailAddress: userBUsername,
                        permissions: []
                    }
                ],
                message: "Test"
            }
        });

        const deletedFollow = await userBClient.query({
            query: GetFollowDocument,
            variables: {
                follow: {
                    collection: {
                        collectionSlug: collectionSlug
                    }
                }
            }
        });

        expect(deletedFollow.data.getFollow != null).equal(true);
    });
});
