import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";
import { expect } from "chai";
import { loadPackageFileFromDisk } from "datapm-lib";
import {
    CreatePackageDocument,
    CreatePackageIssueCommentDocument,
    CreatePackageIssueDocument,
    CreateVersionDocument,
    DeletePackageIssueDocument,
    DeletePackageIssuesDocument,
    OrderBy,
    PackageIssueDocument,
    PackageIssuesDocument,
    PackageIssueStatus,
    Permission,
    SetPackagePermissionsDocument,
    UpdateCatalogDocument,
    UpdatePackageDocument,
    UpdatePackageIssueCommentDocument,
    UpdatePackageIssueDocument,
    UpdatePackageIssuesStatusesDocument,
    UpdatePackageIssueStatusDocument
} from "./registry-client";
import { createAnonymousClient, createUser } from "./test-utils";

describe("Package Issues and Comments Tests", async () => {
    let userAClient: ApolloClient<NormalizedCacheObject>;
    let userBClient: ApolloClient<NormalizedCacheObject>;
    let anonymousClient = createAnonymousClient();

    before(async () => {});

    it("Create users A & B", async function () {
        userAClient = await createUser(
            "FirstA",
            "LastA",
            "testA-package-issues",
            "testA-package-issues@test.datapm.io",
            "passwordA!"
        );
        userBClient = await createUser(
            "FirstB",
            "LastB",
            "testB-package-issues",
            "testB-package-issues@test.datapm.io",
            "passwordB!"
        );
        expect(userAClient).to.exist;
        expect(userBClient).to.exist;
    });

    it("Should allow user to create an issue in their package", async function () {
        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues",
                    displayName: "Congressional LegislatorsA",
                    description: "Test upload of congressional legislatorsA"
                }
            }
        });
        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues-always-private",
                    displayName: "Congressional LegislatorsA",
                    description: "Test upload of congressional legislatorsA"
                }
            }
        });

        let packageFileContents = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");
        const packageFileString = JSON.stringify(packageFileContents);

        await userAClient.mutate({
            mutation: CreateVersionDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues"
                },
                value: {
                    packageFile: packageFileString
                }
            }
        });

        await userAClient.mutate({
            mutation: CreateVersionDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues-always-private"
                },
                value: {
                    packageFile: packageFileString
                }
            }
        });

        const issueResponse = await userAClient.mutate({
            mutation: CreatePackageIssueDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues"
                },
                issue: {
                    subject: "This is my issue",
                    content: "This is my content"
                }
            }
        });

        expect(issueResponse.data).to.exist;
        expect(issueResponse.errors).to.be.undefined;
        if (issueResponse.data) {
            expect(issueResponse.data.createPackageIssue).to.not.be.undefined;
        }
    });

    it("Should allow user to view issues in their package", async function () {
        const issuesResponse = await userAClient.query({
            query: PackageIssuesDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues"
                },
                includeClosedIssues: false,
                includeOpenIssues: true,
                limit: 1,
                offset: 0,
                orderBy: OrderBy.CREATED_AT
            }
        });

        expect(issuesResponse.data).to.exist;
        expect(issuesResponse.errors).to.be.undefined;
        if (issuesResponse.data) {
            expect(issuesResponse.data.packageIssues).to.not.be.undefined;
            expect(issuesResponse.data.packageIssues).to.not.be.empty;
        }
    });

    it("Should not allow user to view issues of a private package that the user doesn't have permissions for", async function () {
        const issuesResponse = await userBClient.query({
            query: PackageIssuesDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues"
                },
                includeClosedIssues: false,
                includeOpenIssues: true,
                limit: 1,
                offset: 0,
                orderBy: OrderBy.CREATED_AT
            }
        });

        expect(issuesResponse.data).to.exist;
        expect(issuesResponse.errors).to.not.be.undefined;
        if (issuesResponse.errors) {
            expect(issuesResponse.errors[0].message).to.equal("NOT_AUTHORIZED");
        }
    });

    it("Should allow user to view issues of a private package that the user has permissions for", async function () {
        await userAClient.mutate({
            mutation: SetPackagePermissionsDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues"
                },
                message: "Hello",
                value: [
                    {
                        usernameOrEmailAddress: "testB-package-issues",
                        permissions: [Permission.VIEW]
                    }
                ]
            }
        });

        const issuesResponse = await userBClient.query({
            query: PackageIssuesDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues"
                },
                includeClosedIssues: false,
                includeOpenIssues: true,
                limit: 1,
                offset: 0,
                orderBy: OrderBy.CREATED_AT
            }
        });

        expect(issuesResponse.data).to.exist;
        expect(issuesResponse.errors).to.be.undefined;
        if (issuesResponse.data) {
            expect(issuesResponse.data.packageIssues).to.not.be.undefined;
            expect(issuesResponse.data.packageIssues).to.not.be.empty;
        }
    });

    it("Should allow unauthenticated users view public package issues", async function () {
        await userAClient.mutate({
            mutation: UpdateCatalogDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-package-issues"
                },
                value: {
                    isPublic: true
                }
            }
        });

        await userAClient.mutate({
            mutation: UpdatePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues"
                },
                value: {
                    isPublic: true
                }
            }
        });

        const issuesResponse = await anonymousClient.query({
            query: PackageIssuesDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues"
                },
                includeClosedIssues: false,
                includeOpenIssues: true,
                limit: 1,
                offset: 0,
                orderBy: OrderBy.CREATED_AT
            }
        });

        expect(issuesResponse.data).to.exist;
        expect(issuesResponse.errors).to.be.undefined;
        if (issuesResponse.data) {
            expect(issuesResponse.data.packageIssues).to.not.be.undefined;
            expect(issuesResponse.data.packageIssues).to.not.be.empty;
        }
    });

    it("Should allow unauthenticated users fetch public package issues", async function () {
        const issuesDetailsResponse = await anonymousClient.query({
            query: PackageIssueDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues"
                },
                packageIssueIdentifier: {
                    issueNumber: 0
                }
            }
        });

        expect(issuesDetailsResponse.data).to.exist;
        expect(issuesDetailsResponse.errors).to.be.undefined;
        if (issuesDetailsResponse.data) {
            expect(issuesDetailsResponse.data.packageIssue).to.not.be.undefined;
        }
    });

    it("Should not allow unauthenticated users fetch private package issues", async function () {
        const issuesDetailsResponse = await anonymousClient.query({
            query: PackageIssueDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues-always-private"
                },
                packageIssueIdentifier: {
                    issueNumber: 0
                }
            }
        });

        expect(issuesDetailsResponse.data).to.exist;
        expect(issuesDetailsResponse.errors).to.not.be.undefined;
        if (issuesDetailsResponse.errors) {
            expect(issuesDetailsResponse.errors[0].message).to.equal("NOT_AUTHENTICATED");
        }
    });

    it("Should not allow users fetch private package issues with no package view permissions", async function () {
        const issuesDetailsResponse = await userBClient.query({
            query: PackageIssueDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues-always-private"
                },
                packageIssueIdentifier: {
                    issueNumber: 0
                }
            }
        });

        expect(issuesDetailsResponse.errors).to.not.be.undefined;
        if (issuesDetailsResponse.errors) {
            expect(issuesDetailsResponse.errors[0].message).to.equal("NOT_AUTHORIZED");
        }
    });

    it("Should allow users fetch private package issues with package view permissions", async function () {
        await userAClient.mutate({
            mutation: SetPackagePermissionsDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues-always-private"
                },
                message: "Hello",
                value: [
                    {
                        usernameOrEmailAddress: "testB-package-issues",
                        permissions: [Permission.VIEW]
                    }
                ]
            }
        });

        const issueResponse = await userAClient.mutate({
            mutation: CreatePackageIssueDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues-always-private"
                },
                issue: {
                    subject: "This is my issue",
                    content: "This is my content"
                }
            }
        });

        if (!issueResponse.data || !issueResponse.data.createPackageIssue) {
            expect.fail("Should've been able to create issue as a package manager");
        }

        const issuesDetailsResponse = await userBClient.query({
            query: PackageIssueDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues-always-private"
                },
                packageIssueIdentifier: {
                    issueNumber: issueResponse.data.createPackageIssue.issueNumber
                }
            }
        });

        expect(issuesDetailsResponse.data).to.exist;
        expect(issuesDetailsResponse.errors).to.be.undefined;
        if (issuesDetailsResponse.data) {
            expect(issuesDetailsResponse.data.packageIssue).to.not.be.undefined;
        }
    });

    it("Should be able to update own issue", async function () {
        const issueResponse = await userBClient.mutate({
            mutation: CreatePackageIssueDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues"
                },
                issue: {
                    subject: "This is my own issue",
                    content: "This is my own content"
                }
            }
        });

        if (!issueResponse.data || !issueResponse.data.createPackageIssue) {
            expect.fail("Should've been able to create issue as a package viewer");
        }

        const issueUpdateResponse = await userBClient.mutate({
            mutation: UpdatePackageIssueDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues"
                },
                issueIdentifier: {
                    issueNumber: issueResponse.data?.createPackageIssue.issueNumber
                },
                issue: {
                    subject: "Hi",
                    content: "Hello there"
                }
            }
        });

        expect(issueUpdateResponse.data).to.exist;
        expect(issueUpdateResponse.errors).to.be.undefined;
        if (issueUpdateResponse.data) {
            expect(issueUpdateResponse.data.updatePackageIssue).to.not.be.undefined;
            if (issueUpdateResponse.data.updatePackageIssue) {
                expect(issueUpdateResponse.data.updatePackageIssue.subject).to.equal("Hi");
            }
        }
    });

    it("Should not be able to update other's issue without manager permissions", async function () {
        const issueUpdateResponse = await userBClient.mutate({
            mutation: UpdatePackageIssueDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues"
                },
                issueIdentifier: {
                    issueNumber: 0
                },
                issue: {
                    subject: "Hi",
                    content: "Hello there"
                }
            }
        });

        expect(issueUpdateResponse.data).to.exist;
        expect(issueUpdateResponse.errors).to.not.be.undefined;
        if (issueUpdateResponse.errors) {
            expect(issueUpdateResponse.errors[0].message).to.equal("NOT_AUTHORIZED");
        }
    });

    it("Should be able to update other's issue with manager permissions", async function () {
        const issueUpdateResponse = await userAClient.mutate({
            mutation: UpdatePackageIssueDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues"
                },
                issueIdentifier: {
                    issueNumber: 1
                },
                issue: {
                    subject: "Hello there buddy",
                    content: "You've been moderated"
                }
            }
        });

        expect(issueUpdateResponse.data).to.exist;
        expect(issueUpdateResponse.errors).to.be.undefined;
        if (issueUpdateResponse.data) {
            expect(issueUpdateResponse.data.updatePackageIssue).to.not.be.undefined;
            if (issueUpdateResponse.data.updatePackageIssue) {
                expect(issueUpdateResponse.data.updatePackageIssue.subject).to.equal("Hello there buddy");
            }
        }
    });

    it("Should not be able to delete other's issue without manager permissions", async function () {
        const issueDeleteResponse = await userBClient.mutate({
            mutation: DeletePackageIssueDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues"
                },
                packageIssueIdentifier: {
                    issueNumber: 0
                }
            }
        });

        expect(issueDeleteResponse.data).to.exist;
        expect(issueDeleteResponse.errors).to.not.be.undefined;
        if (issueDeleteResponse.errors) {
            expect(issueDeleteResponse.errors[0].message).to.equal("NOT_AUTHORIZED");
        }
    });

    it("Should not be able to delete own issue without manager permissions", async function () {
        const issueResponse = await userBClient.mutate({
            mutation: CreatePackageIssueDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues"
                },
                issue: {
                    subject: "This is my own issue",
                    content: "This is my own content"
                }
            }
        });

        if (!issueResponse.data || !issueResponse.data.createPackageIssue) {
            expect.fail("Should've been able to create issue as a package viewer");
        }

        const issueDeleteResponse = await userBClient.mutate({
            mutation: DeletePackageIssueDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues"
                },
                packageIssueIdentifier: {
                    issueNumber: issueResponse.data.createPackageIssue.issueNumber
                }
            }
        });

        if (!issueDeleteResponse.data) {
            expect.fail("Should've been able to delete own issue");
        }

        expect(issueDeleteResponse.errors).to.be.undefined;
        expect(issueDeleteResponse.data.deletePackageIssue).to.be.null;
    });

    it("Should be able to delete other's issue with manager permissions", async function () {
        const issueResponse = await userBClient.mutate({
            mutation: CreatePackageIssueDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues"
                },
                issue: {
                    subject: "This is my own issue",
                    content: "This is my own content"
                }
            }
        });

        if (!issueResponse.data || !issueResponse.data.createPackageIssue) {
            expect.fail("Should've been able to create issue as a package viewer");
        }

        const issueDeleteResponse = await userAClient.mutate({
            mutation: DeletePackageIssueDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues"
                },
                packageIssueIdentifier: {
                    issueNumber: issueResponse.data.createPackageIssue.issueNumber
                }
            }
        });

        if (!issueDeleteResponse.data) {
            expect.fail("Should've been able to delete other's issue as manager");
        }

        expect(issueDeleteResponse.errors).to.be.undefined;
        expect(issueDeleteResponse.data.deletePackageIssue).to.be.null;
    });

    it("Should be able to batch delete other's issues with manager permissions", async function () {
        const issueResponse1 = await userBClient.mutate({
            mutation: CreatePackageIssueDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues"
                },
                issue: {
                    subject: "This is my own issue",
                    content: "This is my own content"
                }
            }
        });

        const issueResponse2 = await userBClient.mutate({
            mutation: CreatePackageIssueDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues"
                },
                issue: {
                    subject: "This is my own issue",
                    content: "This is my own content"
                }
            }
        });

        if (
            !issueResponse1.data ||
            !issueResponse1.data.createPackageIssue ||
            !issueResponse2.data ||
            !issueResponse2.data.createPackageIssue
        ) {
            expect.fail("Should've been able to create issue as a package viewer");
        }

        const issueDeleteResponse = await userAClient.mutate({
            mutation: DeletePackageIssuesDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues"
                },
                issuesIdentifiers: [
                    { issueNumber: issueResponse1.data.createPackageIssue.issueNumber },
                    { issueNumber: issueResponse2.data.createPackageIssue.issueNumber }
                ]
            }
        });

        if (!issueDeleteResponse.data) {
            expect.fail("Should've been able to delete other's issue as manager");
        }

        expect(issueDeleteResponse.errors).to.be.undefined;
        expect(issueDeleteResponse.data.deletePackageIssues).to.be.null;
    });

    it("Should be able to batch delete own issues without manager permissions", async function () {
        const issueResponse1 = await userBClient.mutate({
            mutation: CreatePackageIssueDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues"
                },
                issue: {
                    subject: "This is my own issue",
                    content: "This is my own content"
                }
            }
        });

        const issueResponse2 = await userBClient.mutate({
            mutation: CreatePackageIssueDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues"
                },
                issue: {
                    subject: "This is my own issue",
                    content: "This is my own content"
                }
            }
        });

        if (
            !issueResponse1.data ||
            !issueResponse1.data.createPackageIssue ||
            !issueResponse2.data ||
            !issueResponse2.data.createPackageIssue
        ) {
            expect.fail("Should've been able to create issue as a package viewer");
        }

        const issueDeleteResponse = await userBClient.mutate({
            mutation: DeletePackageIssuesDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues"
                },
                issuesIdentifiers: [
                    { issueNumber: issueResponse1.data.createPackageIssue.issueNumber },
                    { issueNumber: issueResponse2.data.createPackageIssue.issueNumber }
                ]
            }
        });

        if (!issueDeleteResponse.data) {
            expect.fail("Should've been able to delete other's issue as manager");
        }

        expect(issueDeleteResponse.errors).to.be.undefined;
        expect(issueDeleteResponse.data.deletePackageIssues).to.be.null;
    });

    it("Should not be able to batch delete own issues without manager permissions", async function () {
        const issueResponse1 = await userAClient.mutate({
            mutation: CreatePackageIssueDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues"
                },
                issue: {
                    subject: "This is my own issue",
                    content: "This is my own content"
                }
            }
        });

        const issueResponse2 = await userBClient.mutate({
            mutation: CreatePackageIssueDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues"
                },
                issue: {
                    subject: "This is my own issue",
                    content: "This is my own content"
                }
            }
        });

        if (
            !issueResponse1.data ||
            !issueResponse1.data.createPackageIssue ||
            !issueResponse2.data ||
            !issueResponse2.data.createPackageIssue
        ) {
            expect.fail("Should've been able to create issue as a package viewer");
        }

        const issueDeleteResponse = await userBClient.mutate({
            mutation: DeletePackageIssuesDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues"
                },
                issuesIdentifiers: [
                    { issueNumber: issueResponse1.data.createPackageIssue.issueNumber },
                    { issueNumber: issueResponse2.data.createPackageIssue.issueNumber }
                ]
            }
        });

        if (!issueDeleteResponse.data) {
            expect.fail("Should've been able to delete other's issue as manager");
        }

        expect(issueDeleteResponse.data).to.exist;
        expect(issueDeleteResponse.errors).to.not.be.undefined;
        if (issueDeleteResponse.errors) {
            expect(issueDeleteResponse.errors[0].message).to.equal("NOT_AUTHORIZED");
        }
    });

    it("Should be able to batch change statuses of other's issues with manager permissions", async function () {
        const issueResponse1 = await userBClient.mutate({
            mutation: CreatePackageIssueDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues"
                },
                issue: {
                    subject: "This is my own issue",
                    content: "This is my own content"
                }
            }
        });

        const issueResponse2 = await userBClient.mutate({
            mutation: CreatePackageIssueDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues"
                },
                issue: {
                    subject: "This is my own issue",
                    content: "This is my own content"
                }
            }
        });

        if (
            !issueResponse1.data ||
            !issueResponse1.data.createPackageIssue ||
            !issueResponse2.data ||
            !issueResponse2.data.createPackageIssue
        ) {
            expect.fail("Should've been able to create issue as a package viewer");
        }

        const issuesStatusChangeResponse = await userAClient.mutate({
            mutation: UpdatePackageIssuesStatusesDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues"
                },
                issuesIdentifiers: [
                    { issueNumber: issueResponse1.data.createPackageIssue.issueNumber },
                    { issueNumber: issueResponse2.data.createPackageIssue.issueNumber }
                ],
                status: { status: PackageIssueStatus.CLOSED }
            }
        });

        if (!issuesStatusChangeResponse.data) {
            expect.fail("Should've been able to delete other's issue as manager");
        }

        expect(issuesStatusChangeResponse.errors).to.be.undefined;
        expect(issuesStatusChangeResponse.data.updatePackageIssuesStatuses).to.be.null;
    });

    it("Should be able to batch change statuses of own issues without manager permissions", async function () {
        const issueResponse1 = await userBClient.mutate({
            mutation: CreatePackageIssueDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues"
                },
                issue: {
                    subject: "This is my own issue",
                    content: "This is my own content"
                }
            }
        });

        const issueResponse2 = await userBClient.mutate({
            mutation: CreatePackageIssueDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues"
                },
                issue: {
                    subject: "This is my own issue",
                    content: "This is my own content"
                }
            }
        });

        if (
            !issueResponse1.data ||
            !issueResponse1.data.createPackageIssue ||
            !issueResponse2.data ||
            !issueResponse2.data.createPackageIssue
        ) {
            expect.fail("Should've been able to create issue as a package viewer");
        }

        const issuesStatusChangeResponse = await userBClient.mutate({
            mutation: UpdatePackageIssuesStatusesDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues"
                },
                issuesIdentifiers: [
                    { issueNumber: issueResponse1.data.createPackageIssue.issueNumber },
                    { issueNumber: issueResponse2.data.createPackageIssue.issueNumber }
                ],
                status: { status: PackageIssueStatus.CLOSED }
            }
        });

        if (!issuesStatusChangeResponse.data) {
            expect.fail("Should've been able to delete other's issue as manager");
        }

        expect(issuesStatusChangeResponse.errors).to.be.undefined;
        expect(issuesStatusChangeResponse.data.updatePackageIssuesStatuses).to.be.null;
    });

    it("Should not be able to batch change statuses of own issues without manager permissions", async function () {
        const issueResponse1 = await userAClient.mutate({
            mutation: CreatePackageIssueDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues"
                },
                issue: {
                    subject: "This is my own issue",
                    content: "This is my own content"
                }
            }
        });

        const issueResponse2 = await userBClient.mutate({
            mutation: CreatePackageIssueDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues"
                },
                issue: {
                    subject: "This is my own issue",
                    content: "This is my own content"
                }
            }
        });

        if (
            !issueResponse1.data ||
            !issueResponse1.data.createPackageIssue ||
            !issueResponse2.data ||
            !issueResponse2.data.createPackageIssue
        ) {
            expect.fail("Should've been able to create issue as a package viewer");
        }

        const issuesStatusChangeResponse = await userBClient.mutate({
            mutation: UpdatePackageIssuesStatusesDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues"
                },
                issuesIdentifiers: [
                    { issueNumber: issueResponse1.data.createPackageIssue.issueNumber },
                    { issueNumber: issueResponse2.data.createPackageIssue.issueNumber }
                ],
                status: { status: PackageIssueStatus.CLOSED }
            }
        });

        if (!issuesStatusChangeResponse.data) {
            expect.fail("Should've been able to delete other's issue as manager");
        }

        expect(issuesStatusChangeResponse.data).to.exist;
        expect(issuesStatusChangeResponse.errors).to.not.be.undefined;
        if (issuesStatusChangeResponse.errors) {
            expect(issuesStatusChangeResponse.errors[0].message).to.equal("NOT_AUTHORIZED");
        }
    });

    it("Should not be able to comment without being authenticated", async function () {
        const commentResponse = await anonymousClient.mutate({
            mutation: CreatePackageIssueCommentDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues"
                },
                issueIdentifier: {
                    issueNumber: 0
                },
                comment: {
                    content: "Hello"
                }
            }
        });

        expect(commentResponse.data).to.exist;
        expect(commentResponse.errors).to.not.be.undefined;
        if (commentResponse.errors) {
            expect(commentResponse.errors[0].message).to.equal("NOT_AUTHORIZED");
        }
    });

    it("Should be able to comment in issue as author", async function () {
        const commentResponse = await userAClient.mutate({
            mutation: CreatePackageIssueCommentDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues"
                },
                issueIdentifier: {
                    issueNumber: 0
                },
                comment: {
                    content: "Hello friends"
                }
            }
        });

        expect(commentResponse.data).to.exist;
        expect(commentResponse.errors).to.be.undefined;
        if (commentResponse.data) {
            expect(commentResponse.data.createPackageIssueComment).to.not.be.undefined;
        }
    });

    it("Should be able to comment in issue with package view permissions", async function () {
        const commentResponse = await userBClient.mutate({
            mutation: CreatePackageIssueCommentDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues"
                },
                issueIdentifier: {
                    issueNumber: 0
                },
                comment: {
                    content: "Hello my friend"
                }
            }
        });

        expect(commentResponse.data).to.exist;
        expect(commentResponse.errors).to.be.undefined;
        if (commentResponse.data) {
            expect(commentResponse.data.createPackageIssueComment).to.not.be.undefined;
        }
    });

    it("Should be able to update own comment in issue", async function () {
        const commentResponse = await userBClient.mutate({
            mutation: UpdatePackageIssueCommentDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues"
                },
                issueIdentifier: {
                    issueNumber: 0
                },
                issueCommentIdentifier: {
                    commentNumber: 1
                },
                comment: { content: "Hello my friendzzz" }
            }
        });

        expect(commentResponse.data).to.exist;
        expect(commentResponse.errors).to.be.undefined;
        if (commentResponse.data) {
            expect(commentResponse.data.updatePackageIssueComment).to.not.be.undefined;
            if (commentResponse.data.updatePackageIssueComment) {
                expect(commentResponse.data.updatePackageIssueComment.content).to.equal("Hello my friendzzz");
            }
        }
    });

    it("Should not be able to update other's comments in issue without package manager permissions", async function () {
        const commentResponse = await userBClient.mutate({
            mutation: UpdatePackageIssueCommentDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues"
                },
                issueIdentifier: {
                    issueNumber: 0
                },
                issueCommentIdentifier: {
                    commentNumber: 0
                },
                comment: { content: "Hello my friendzzz" }
            }
        });

        expect(commentResponse.data).to.exist;
        expect(commentResponse.errors).to.not.be.undefined;
        if (commentResponse.errors) {
            expect(commentResponse.errors[0].message).to.equal("NOT_AUTHORIZED");
        }
    });

    it("Should be able to update other's comments in issue with package manager permissions", async function () {
        const commentResponse = await userAClient.mutate({
            mutation: UpdatePackageIssueCommentDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues"
                },
                issueIdentifier: {
                    issueNumber: 0
                },
                issueCommentIdentifier: {
                    commentNumber: 1
                },
                comment: { content: "Hello cool friends" }
            }
        });

        expect(commentResponse.data).to.exist;
        expect(commentResponse.errors).to.be.undefined;
        if (commentResponse.data) {
            expect(commentResponse.data.updatePackageIssueComment).to.not.be.undefined;
            if (commentResponse.data.updatePackageIssueComment) {
                expect(commentResponse.data.updatePackageIssueComment.content).to.equal("Hello cool friends");
            }
        }
    });

    it("Should be able to close created issue", async function () {
        const commentResponse = await userAClient.mutate({
            mutation: UpdatePackageIssueStatusDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues"
                },
                issueIdentifier: {
                    issueNumber: 0
                },
                status: { status: PackageIssueStatus.CLOSED }
            }
        });

        expect(commentResponse.data).to.exist;
        expect(commentResponse.errors).to.be.undefined;
        if (commentResponse.data) {
            expect(commentResponse.data.updatePackageIssueStatus).to.not.be.undefined;
            if (commentResponse.data.updatePackageIssueStatus) {
                expect(commentResponse.data.updatePackageIssueStatus.status).to.equal(PackageIssueStatus.CLOSED);
            }
        }
    });

    it("Should be able to reopen created issue", async function () {
        const commentResponse = await userAClient.mutate({
            mutation: UpdatePackageIssueStatusDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues"
                },
                issueIdentifier: {
                    issueNumber: 0
                },
                status: { status: PackageIssueStatus.OPEN }
            }
        });

        expect(commentResponse.data).to.exist;
        expect(commentResponse.errors).to.be.undefined;
        if (commentResponse.data) {
            expect(commentResponse.data.updatePackageIssueStatus).to.not.be.undefined;
            if (commentResponse.data.updatePackageIssueStatus) {
                expect(commentResponse.data.updatePackageIssueStatus.status).to.equal(PackageIssueStatus.OPEN);
            }
        }
    });

    it("Should not be able to close other's issue with only package view permissions", async function () {
        const commentResponse = await userBClient.mutate({
            mutation: UpdatePackageIssueStatusDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues"
                },
                issueIdentifier: {
                    issueNumber: 0
                },
                status: { status: PackageIssueStatus.CLOSED }
            }
        });

        expect(commentResponse.data).to.exist;
        expect(commentResponse.errors).to.not.be.undefined;
        if (commentResponse.errors) {
            expect(commentResponse.errors[0].message).to.equal("NOT_AUTHORIZED");
        }
    });

    it("Should not be able to close other's issue if not authenticated", async function () {
        const commentResponse = await anonymousClient.mutate({
            mutation: UpdatePackageIssueStatusDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues"
                },
                issueIdentifier: {
                    issueNumber: 0
                },
                status: { status: PackageIssueStatus.CLOSED }
            }
        });

        expect(commentResponse.data).to.exist;
        expect(commentResponse.errors).to.not.be.undefined;
        if (commentResponse.errors) {
            expect(commentResponse.errors[0].message).to.equal("NOT_AUTHORIZED");
        }
    });

    it("Should not be able to delete other's issue if not authenticated", async function () {
        const commentResponse = await anonymousClient.mutate({
            mutation: DeletePackageIssueDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues"
                },
                packageIssueIdentifier: { issueNumber: 0 }
            }
        });

        expect(commentResponse.data).to.exist;
        expect(commentResponse.errors).to.not.be.undefined;
        if (commentResponse.errors) {
            expect(commentResponse.errors[0].message).to.equal("NOT_AUTHORIZED");
        }
    });

    it("Should not be able to delete other's issue without package manage permissions", async function () {
        const commentResponse = await userBClient.mutate({
            mutation: DeletePackageIssueDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: "testA-package-issues",
                    packageSlug: "package-with-issues"
                },
                packageIssueIdentifier: { issueNumber: 0 }
            }
        });

        expect(commentResponse.data).to.exist;
        expect(commentResponse.errors).to.not.be.undefined;
        if (commentResponse.errors) {
            expect(commentResponse.errors[0].message).to.equal("NOT_AUTHORIZED");
        }
    });
});
