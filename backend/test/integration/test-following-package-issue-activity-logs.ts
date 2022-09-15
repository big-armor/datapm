import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";
import { createUser } from "./test-utils";
import {
    CreatePackageDocument,
    ActivityLogEventType,
    CreateVersionDocument,
    UpdatePackageDocument,
    CreateCatalogDocument,
    SaveFollowDocument,
    NotificationFrequency,
    MyFollowingActivityDocument,
    CreatePackageIssueDocument,
    UpdatePackageIssueStatusDocument,
    PackageIssueStatus,
    CreatePackageIssueCommentDocument
} from "./registry-client";
import { expect } from "chai";
import { loadPackageFileFromDisk } from "datapm-lib";

describe("Following Package Issues Activity Log Tests", async () => {
    const userOneUsername = "FollowOnePackageIssue";
    const userTwoUsername = "FollowTwoPackageIssue";

    let userOneClient: ApolloClient<NormalizedCacheObject>;
    let userTwoClient: ApolloClient<NormalizedCacheObject>;

    before(async () => {
        userOneClient = await createUser(
            "FirstOne",
            "LastOne",
            userOneUsername,
            "testOne-fol-pkg-is@test.datapm.io",
            "passwordOne!"
        );
        userTwoClient = await createUser(
            "FirstTwo",
            "LastTwo",
            userTwoUsername,
            "testTwo-fol-pkg-is@test.datapm.io",
            "passwordTwo!"
        );
    });

    it("Followed package issue shows PACKAGE_ISSUE_STATUS_CHANGE log", async function () {
        const catalogSlug = "usr-fol-isu-ctg";
        const packageSlug = "usr-fol-isu-pkg";

        await userTwoClient.mutate({
            mutation: CreateCatalogDocument,
            variables: {
                value: {
                    slug: catalogSlug,
                    displayName: "Congressional Legislators",
                    description: "Test upload of congressional legislators",
                    isPublic: true
                }
            }
        });

        await userTwoClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: catalogSlug,
                    packageSlug: packageSlug,
                    displayName: "Congressional Legislators",
                    description: "Test upload of congressional legislators"
                }
            }
        });

        await userTwoClient.mutate({
            mutation: CreatePackageIssueDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: catalogSlug,
                    packageSlug: packageSlug
                },
                issue: {
                    subject: "Hello",
                    content: "My content"
                }
            }
        });

        await userTwoClient.mutate({
            mutation: UpdatePackageIssueStatusDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: catalogSlug,
                    packageSlug: packageSlug
                },
                issueIdentifier: {
                    issueNumber: 0
                },
                status: {
                    status: PackageIssueStatus.CLOSED
                }
            }
        });

        const packageFileContents = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");
        const packageFileString = JSON.stringify(packageFileContents);

        await userTwoClient.mutate({
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

        await userTwoClient.mutate({
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

        await userOneClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    packageIssue: {
                        packageIdentifier: {
                            packageSlug,
                            catalogSlug
                        },
                        issueNumber: 0
                    },
                    notificationFrequency: NotificationFrequency.WEEKLY
                }
            }
        });

        const activitiesResponse = await userOneClient.query({
            query: MyFollowingActivityDocument,
            variables: { limit: 10, offset: 0 }
        });

        expect(activitiesResponse.data).to.not.equal(undefined);

        if (
            !activitiesResponse.data ||
            !activitiesResponse.data.myFollowingActivity ||
            !activitiesResponse.data.myFollowingActivity.logs
        ) {
            expect(true).to.equal(false, "Should've returned created following activity collection");
            return;
        }

        expect(activitiesResponse.data.myFollowingActivity.logs.length > 0).to.equal(true);

        const createdLog = activitiesResponse.data.myFollowingActivity.logs.find(
            (l) => ActivityLogEventType.PACKAGE_ISSUE_STATUS_CHANGE === l.eventType
        );
        if (!createdLog || !createdLog.user || !createdLog.targetPackage || !createdLog.targetPackageIssue) {
            expect(true).equal(false, "Should've returned created following activity with user and package data");
            return;
        }

        const targetPackageIdentifier = createdLog.targetPackage.identifier;
        expect(createdLog.user.username).to.equal(userTwoUsername);
        expect(targetPackageIdentifier.catalogSlug).to.equal(catalogSlug);
        expect(targetPackageIdentifier.packageSlug).to.equal(packageSlug);

        const targetPackageIssueNumber = createdLog.targetPackageIssue.issueNumber;
        expect(targetPackageIssueNumber).to.equal(0);
    });

    it("Followed package issue shows PACKAGE_ISSUE_COMMENT_CREATED log", async function () {
        const catalogSlug = "issu-fol-ctg";
        const packageSlug = "issu-fol-pkg";

        await userTwoClient.mutate({
            mutation: CreateCatalogDocument,
            variables: {
                value: {
                    slug: catalogSlug,
                    displayName: "Congressional Legislators",
                    description: "Test upload of congressional legislators",
                    isPublic: true
                }
            }
        });

        await userTwoClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: catalogSlug,
                    packageSlug: packageSlug,
                    displayName: "Congressional Legislators",
                    description: "Test upload of congressional legislators"
                }
            }
        });

        await userTwoClient.mutate({
            mutation: CreatePackageIssueDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: catalogSlug,
                    packageSlug: packageSlug
                },
                issue: {
                    subject: "Hello",
                    content: "My content"
                }
            }
        });

        await userTwoClient.mutate({
            mutation: CreatePackageIssueCommentDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: catalogSlug,
                    packageSlug: packageSlug
                },
                issueIdentifier: {
                    issueNumber: 0
                },
                comment: {
                    content: "Hello there"
                }
            }
        });

        const packageFileContents = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");
        const packageFileString = JSON.stringify(packageFileContents);

        await userTwoClient.mutate({
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

        await userTwoClient.mutate({
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

        await userOneClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    packageIssue: {
                        packageIdentifier: {
                            packageSlug,
                            catalogSlug
                        },
                        issueNumber: 0
                    },
                    notificationFrequency: NotificationFrequency.WEEKLY
                }
            }
        });

        const activitiesResponse = await userOneClient.query({
            query: MyFollowingActivityDocument,
            variables: { limit: 10, offset: 0 }
        });

        expect(activitiesResponse.data).to.not.equal(undefined);

        if (
            !activitiesResponse.data ||
            !activitiesResponse.data.myFollowingActivity ||
            !activitiesResponse.data.myFollowingActivity.logs
        ) {
            expect(true).to.equal(false, "Should've returned created following activity collection");
            return;
        }

        expect(activitiesResponse.data.myFollowingActivity.logs.length > 0).to.equal(true);

        const createdLog = activitiesResponse.data.myFollowingActivity.logs.find(
            (l) => ActivityLogEventType.PACKAGE_ISSUE_COMMENT_CREATED === l.eventType
        );
        if (!createdLog || !createdLog.user || !createdLog.targetPackage || !createdLog.targetPackageIssue) {
            expect(true).equal(false, "Should've returned created following activity with user and package data");
            return;
        }

        const targetPackageIdentifier = createdLog.targetPackage.identifier;
        expect(createdLog.user.username).to.equal(userTwoUsername);
        expect(targetPackageIdentifier.catalogSlug).to.equal(catalogSlug);
        expect(targetPackageIdentifier.packageSlug).to.equal(packageSlug);

        const targetPackageIssueNumber = createdLog.targetPackageIssue.issueNumber;
        expect(targetPackageIssueNumber).to.equal(0);
    });
});
