import { ApolloClient, FetchResult, NormalizedCacheObject } from "@apollo/client/core";
import { createUser } from "./test-utils";
import {
    CreatePackageDocument,
    MeDocument,
    MyActivityDocument,
    ActivityLogEventType,
    CreateVersionDocument,
    UpdatePackageDocument,
    ActivityLogChangeType,
    UpdateCatalogDocument,
    CreateCollectionDocument,
    AddPackageToCollectionDocument,
    PackageFetchedDocument,
    PackageActivitiesDocument,
    PackageDocument,
    RemovePackageFromCollectionDocument,
    UpdateCollectionDocument,
    DeleteCollectionDocument,
    DeleteVersionDocument,
    DeletePackageDocument,
    CreateCatalogDocument,
    DeleteCatalogDocument,
    DeleteGroupDocument,
    CreateVersionMutation,
    SetUserCollectionPermissionsDocument,
    Permission,
    SetPackagePermissionsDocument,
    RemovePackagePermissionsDocument,
    CreateGroupDocument,
    AddOrUpdateUserToGroupDocument,
    RemoveUserFromGroupDocument,
    AddOrUpdateGroupToPackageDocument,
    RemoveGroupFromPackageDocument,
    User
} from "./registry-client";
import { expect } from "chai";
import { loadPackageFileFromDisk } from "datapm-lib";
import { ActivityLogLine, findActivityLogLine, serverLogLines } from "./setup";

describe("Activity Log Tests", async () => {
    let userOne: User;
    let userTwo: User;
    let userOneClient: ApolloClient<NormalizedCacheObject>;
    let userTwoClient: ApolloClient<NormalizedCacheObject>;

    before(async () => {
        userOneClient = await createUser(
            "FirstOne",
            "LastOne",
            "testOne-packages",
            "testOne-packages@test.datapm.io",
            "passwordOne!"
        );
        userTwoClient = await createUser(
            "FirstTwo",
            "LastTwo",
            "testTwo-packages",
            "testTwo-packages@test.datapm.io",
            "passwordTwo!"
        );

        const userOneResponse = await userOneClient.query({
            query: MeDocument
        });

        const userTwoResponse = await userTwoClient.query({
            query: MeDocument
        });

        userOne = userOneResponse.data?.me.user;
        userTwo = userTwoResponse.data?.me.user;
    });

    it("Should show USER_CREATED", async function () {
        const response = await userOneClient.query({
            query: MyActivityDocument,
            variables: { filter: { eventType: [ActivityLogEventType.USER_CREATED], limit: 100, offset: 0 } }
        });

        expect(response.data).to.not.equal(undefined);
        expect(response.data.myActivity).to.not.equal(undefined);
        expect(response.data.myActivity.logs.length).to.equal(1);
        expect(response.data.myActivity.logs[0]?.user?.username).to.equal(userOne.username);
        expect(response.data.myActivity.logs[0]?.eventType).to.equal(ActivityLogEventType.USER_CREATED);

        const line = serverLogLines.find((l: string) =>
            findActivityLogLine(l, (activityLogLine: ActivityLogLine) => {
                return (
                    activityLogLine.eventType === ActivityLogEventType.USER_CREATED &&
                    activityLogLine.username === userOne.username
                );
            })
        );
        expect(line).to.not.equal(undefined);
    });

    it("Should show GROUP_CREATED", async function () {
        const response = await userOneClient.query({
            query: CreateGroupDocument,
            variables: {
                name: "Test Activity Log",
                groupSlug: "test-activity-log",
                description: "Test Activity Log Description"
            }
        });

        expect(response.data).to.not.equal(undefined);
        expect(response.data.createGroup).to.not.equal(undefined);
        expect(response.data.createGroup.name).to.equal("Test Activity Log");
        expect(response.data.createGroup.slug).to.equal("test-activity-log");

        const logResponse = await userOneClient.query({
            query: MyActivityDocument,
            variables: { filter: { eventType: [ActivityLogEventType.GROUP_CREATED], limit: 100, offset: 0 } }
        });

        expect(logResponse.data).to.not.equal(undefined);
        expect(logResponse.data.myActivity).to.not.equal(undefined);
        expect(logResponse.data.myActivity.logs.length).to.equal(1);
        expect(logResponse.data.myActivity.logs[0]?.user?.username).to.equal(userOne.username);
        expect(logResponse.data.myActivity.logs[0]?.targetGroup?.slug).to.equal("test-activity-log");
        expect(logResponse.data.myActivity.logs[0]?.targetGroup?.name).to.equal("Test Activity Log");

        expect(
            serverLogLines.find((l: string) =>
                findActivityLogLine(l, (activityLogLine: ActivityLogLine) => {
                    return (
                        activityLogLine.eventType === ActivityLogEventType.GROUP_CREATED &&
                        activityLogLine.username === userOne.username &&
                        activityLogLine.targetGroupSlug === "test-activity-log"
                    );
                })
            )
        ).to.not.equal(undefined);
    });

    it("Should show GROUP_MEMBER_PERMISSION_ADDED_UPDATED", async function () {
        const response = await userOneClient.query({
            query: AddOrUpdateUserToGroupDocument,
            variables: {
                groupSlug: "test-activity-log",
                userPermissions: [
                    {
                        permissions: [Permission.VIEW, Permission.EDIT, Permission.MANAGE],
                        usernameOrEmailAddress: userTwo.username
                    }
                ]
            }
        });

        expect(response.data).to.not.equal(undefined);

        const logResponse = await userOneClient.query({
            query: MyActivityDocument,
            variables: {
                filter: {
                    eventType: [ActivityLogEventType.GROUP_MEMBER_PERMISSION_ADDED_UPDATED],
                    limit: 100,
                    offset: 0
                }
            }
        });

        expect(logResponse.data).to.not.equal(undefined);
        expect(logResponse.data.myActivity).to.not.equal(undefined);
        expect(logResponse.data.myActivity.logs.length).to.equal(1);
        expect(logResponse.data.myActivity.logs[0]?.user?.username).to.equal(userOne.username);
        expect(logResponse.data.myActivity.logs[0]?.targetGroup?.slug).to.equal("test-activity-log");
        expect(logResponse.data.myActivity.logs[0]?.targetGroup?.name).to.equal("Test Activity Log");
        expect(logResponse.data.myActivity.logs[0]?.targetUser?.username).to.equal(userTwo.username);
        expect(logResponse.data.myActivity.logs[0]?.permissions).to.deep.equal([
            Permission.VIEW,
            Permission.EDIT,
            Permission.MANAGE
        ]);

        expect(
            serverLogLines.find((l: string) =>
                findActivityLogLine(l, (activityLogLine: ActivityLogLine) => {
                    return (
                        activityLogLine.eventType === ActivityLogEventType.GROUP_MEMBER_PERMISSION_ADDED_UPDATED &&
                        activityLogLine.username === userOne.username &&
                        activityLogLine.targetGroupSlug === "test-activity-log"
                    );
                })
            )
        ).to.not.equal(undefined);
    });

    it("Should show PACKAGE_CREATED", async function () {
        const createPackageResponse = await userOneClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: "testOne-packages",
                    packageSlug: "congressional-legislators",
                    displayName: "Congressional Legislators",
                    description: "Test upload of congressional legislators"
                }
            }
        });

        expect(createPackageResponse.errors == null).to.equal(true);

        const response = await userOneClient.query({
            query: MyActivityDocument,
            variables: { filter: { eventType: [ActivityLogEventType.PACKAGE_CREATED], limit: 100, offset: 0 } }
        });

        expect(response.data).to.not.equal(undefined);
        expect(response.data.myActivity).to.not.equal(undefined);
        expect(response.data.myActivity.logs.length).to.equal(1);
        expect(response.data.myActivity.logs[0]?.user?.username).to.equal(userOne.username);
        expect(response.data.myActivity.logs[0]?.targetPackage?.identifier.catalogSlug).to.equal("testOne-packages");
        expect(response.data.myActivity.logs[0]?.targetPackage?.identifier.packageSlug).to.equal(
            "congressional-legislators"
        );

        expect(
            serverLogLines.find((l: string) =>
                findActivityLogLine(l, (activityLogLine: ActivityLogLine) => {
                    return (
                        activityLogLine.eventType === ActivityLogEventType.PACKAGE_CREATED &&
                        activityLogLine.username === userOne.username &&
                        activityLogLine.targetPackageIdentifier === "testOne-packages/congressional-legislators"
                    );
                })
            )
        ).to.not.equal(undefined);

        expect(
            serverLogLines.find((l: string) =>
                findActivityLogLine(l, (activityLogLine: ActivityLogLine) => {
                    return (
                        activityLogLine.eventType === ActivityLogEventType.CATALOG_PACKAGE_ADDED &&
                        activityLogLine.targetCatalogSlug === "testOne-packages"
                    );
                })
            )
        ).to.not.equal(undefined);
    });

    it("Should show CATALOG_CREATED", async function () {
        const createCatalogResponse = await userOneClient.mutate({
            mutation: CreateCatalogDocument,
            variables: {
                value: {
                    slug: "testOne-packages-catalog2",
                    displayName: "Congressional Legislators",
                    description: "Test upload of congressional legislators",
                    isPublic: true
                }
            }
        });

        expect(createCatalogResponse.errors == null).to.equal(true);

        const response = await userOneClient.query({
            query: MyActivityDocument,
            variables: { filter: { eventType: [ActivityLogEventType.CATALOG_CREATED], limit: 100, offset: 0 } }
        });

        expect(response.data).to.not.equal(undefined);
        expect(response.data.myActivity).to.not.equal(undefined);
        expect(response.data.myActivity.logs.length).to.equal(1);
        expect(response.data.myActivity.logs[0]?.user?.username).to.equal(userOne.username);
        expect(response.data.myActivity.logs[0]?.targetCatalog?.identifier.catalogSlug).to.equal(
            "testOne-packages-catalog2"
        );

        expect(
            serverLogLines.find((l: string) =>
                findActivityLogLine(l, (activityLogLine: ActivityLogLine) => {
                    return (
                        activityLogLine.eventType === ActivityLogEventType.CATALOG_CREATED &&
                        activityLogLine.username === userOne.username &&
                        activityLogLine.targetCatalogSlug === "testOne-packages-catalog2"
                    );
                })
            )
        ).to.not.equal(undefined);
    });

    it("Should show VERSION_CREATED", async function () {
        const packageFileContents = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");

        const packageFileString = JSON.stringify(packageFileContents);

        let response: FetchResult<
            CreateVersionMutation,
            Record<string, unknown>,
            Record<string, unknown>
        > | null = null;

        try {
            response = await userOneClient.mutate({
                mutation: CreateVersionDocument,
                variables: {
                    identifier: {
                        catalogSlug: "testOne-packages",
                        packageSlug: "congressional-legislators"
                    },
                    value: {
                        packageFile: packageFileString
                    }
                }
            });
        } catch (error) {
            console.log(JSON.stringify(error, null, 1));

            expect.fail("There was an error - " + error.message);
        }
        expect(response.errors == null, "no errors").equal(true);

        const activityLogResponse = await userOneClient.query({
            query: MyActivityDocument,
            variables: { filter: { eventType: [ActivityLogEventType.VERSION_CREATED], limit: 100, offset: 0 } }
        });

        expect(response.data).to.not.equal(undefined);
        expect(activityLogResponse.data.myActivity).to.not.equal(undefined);
        expect(activityLogResponse.data.myActivity.logs.length).to.equal(1);
        expect(activityLogResponse.data.myActivity.logs[0]?.eventType).to.equal(ActivityLogEventType.VERSION_CREATED);
        expect(activityLogResponse.data.myActivity.logs[0]?.user?.username).to.equal(userOne.username);
        expect(activityLogResponse.data.myActivity.logs[0]?.targetPackage?.identifier.catalogSlug).to.equal(
            "testOne-packages"
        );
        expect(activityLogResponse.data.myActivity.logs[0]?.targetPackage?.identifier.packageSlug).to.equal(
            "congressional-legislators"
        );

        const version = activityLogResponse.data.myActivity.logs[0]?.targetPackageVersion;

        if (version == null) {
            expect.fail("version is null");
        }

        expect(version.identifier.versionMajor).to.equal(1);
        expect(version.identifier.versionMinor).to.equal(0);
        expect(version.identifier.versionPatch).to.equal(0);

        const line = serverLogLines.find((l: string) =>
            findActivityLogLine(l, (activityLogLine: ActivityLogLine) => {
                return (
                    activityLogLine.eventType === ActivityLogEventType.VERSION_CREATED &&
                    activityLogLine.username === userOne.username &&
                    activityLogLine.targetPackageIdentifier === "testOne-packages/congressional-legislators" &&
                    activityLogLine.targetVersionNumber === "1.0.0"
                );
            })
        );

        expect(line).to.not.equal(undefined);
    });

    it("Should show VERSION_UPDATED", async function () {
        const packageFileContents = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");

        (packageFileContents.schemas[0].recordCount as number) += 1;

        const packageFileString = JSON.stringify(packageFileContents);

        let response: FetchResult<
            CreateVersionMutation,
            Record<string, unknown>,
            Record<string, unknown>
        > | null = null;

        try {
            response = await userOneClient.mutate({
                mutation: CreateVersionDocument,
                variables: {
                    identifier: {
                        catalogSlug: "testOne-packages",
                        packageSlug: "congressional-legislators"
                    },
                    value: {
                        packageFile: packageFileString
                    }
                }
            });
        } catch (error) {
            console.log(JSON.stringify(error, null, 1));

            expect.fail("There was an error - " + error.message);
        }

        expect(response.errors == null, "no errors").equal(true);

        const activityLogResponse = await userOneClient.query({
            query: MyActivityDocument,
            variables: { filter: { eventType: [ActivityLogEventType.VERSION_UPDATED], limit: 100, offset: 0 } }
        });

        expect(response.data).to.not.equal(undefined);
        expect(activityLogResponse.data.myActivity).to.not.equal(undefined);
        expect(activityLogResponse.data.myActivity.logs.length).to.equal(1);
        expect(activityLogResponse.data.myActivity.logs[0]?.eventType).to.equal(ActivityLogEventType.VERSION_UPDATED);
        expect(activityLogResponse.data.myActivity.logs[0]?.user?.username).to.equal(userOne.username);
        expect(activityLogResponse.data.myActivity.logs[0]?.targetPackage?.identifier.catalogSlug).to.equal(
            "testOne-packages"
        );
        expect(activityLogResponse.data.myActivity.logs[0]?.targetPackage?.identifier.packageSlug).to.equal(
            "congressional-legislators"
        );

        const version = activityLogResponse.data.myActivity.logs[0]?.targetPackageVersion;

        if (version == null) {
            expect.fail("version is null");
        }

        expect(version.identifier.versionMajor).to.equal(1);
        expect(version.identifier.versionMinor).to.equal(0);
        expect(version.identifier.versionPatch).to.equal(0);

        const line = serverLogLines.find((l: string) =>
            findActivityLogLine(l, (activityLogLine: ActivityLogLine) => {
                return (
                    activityLogLine.eventType === ActivityLogEventType.VERSION_UPDATED &&
                    activityLogLine.username === userOne.username &&
                    activityLogLine.targetPackageIdentifier === "testOne-packages/congressional-legislators" &&
                    activityLogLine.targetVersionNumber === "1.0.0"
                );
            })
        );

        expect(line).to.not.equal(undefined);
    });

    it("Should show CATALOG_EDIT", async function () {
        const response = await userOneClient.mutate({
            mutation: UpdateCatalogDocument,
            variables: {
                identifier: {
                    catalogSlug: "testOne-packages"
                },
                value: {
                    isPublic: true
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);

        const activityLogResponse = await userOneClient.query({
            query: MyActivityDocument,
            variables: {
                filter: {
                    eventType: [ActivityLogEventType.CATALOG_EDIT, ActivityLogEventType.CATALOG_PUBLIC_CHANGED],
                    limit: 100,
                    offset: 0
                }
            }
        });

        expect(response.data).to.not.equal(undefined);
        expect(activityLogResponse.data.myActivity).to.not.equal(undefined);
        expect(activityLogResponse.data.myActivity.logs.length).to.equal(2);
        expect(activityLogResponse.data.myActivity.logs[0]?.eventType).to.equal(ActivityLogEventType.CATALOG_EDIT);
        expect(activityLogResponse.data.myActivity.logs[0]?.user?.username).to.equal(userOne.username);
        expect(activityLogResponse.data.myActivity.logs[0]?.targetCatalog?.identifier.catalogSlug).to.equal(
            "testOne-packages"
        );
        expect(activityLogResponse.data.myActivity.logs[1]?.eventType).to.equal(
            ActivityLogEventType.CATALOG_PUBLIC_CHANGED
        );
        expect(activityLogResponse.data.myActivity.logs[1]?.changeType).to.equal(ActivityLogChangeType.PUBLIC_ENABLED);

        const line = serverLogLines.find((l: string) =>
            findActivityLogLine(l, (activityLogLine: ActivityLogLine) => {
                return (
                    activityLogLine.eventType === ActivityLogEventType.CATALOG_EDIT &&
                    activityLogLine.username === userOne.username &&
                    activityLogLine.targetCatalogSlug === "testOne-packages"
                );
            })
        );

        expect(line).to.not.equal(undefined);

        const catalogPublicChangedLine = serverLogLines.find((l: string) =>
            findActivityLogLine(l, (activityLogLine: ActivityLogLine) => {
                return (
                    activityLogLine.eventType === ActivityLogEventType.CATALOG_PUBLIC_CHANGED &&
                    activityLogLine.username === userOne.username &&
                    activityLogLine.changeType === ActivityLogChangeType.PUBLIC_ENABLED
                );
            })
        );

        expect(catalogPublicChangedLine).to.not.equal(undefined);
    });

    it("Should show PACKAGE_EDIT", async function () {
        const response = await userOneClient.mutate({
            mutation: UpdatePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testOne-packages",
                    packageSlug: "congressional-legislators"
                },
                value: {
                    isPublic: true
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);

        const activityLogResponse = await userOneClient.query({
            query: MyActivityDocument,
            variables: {
                filter: {
                    eventType: [ActivityLogEventType.PACKAGE_EDIT, ActivityLogEventType.PACKAGE_PUBLIC_CHANGED],
                    limit: 100,
                    offset: 0
                }
            }
        });

        expect(response.data).to.not.equal(undefined);
        expect(activityLogResponse.data.myActivity).to.not.equal(undefined);
        expect(activityLogResponse.data.myActivity.logs.length).to.equal(2);
        expect(activityLogResponse.data.myActivity.logs[0]?.eventType).to.equal(ActivityLogEventType.PACKAGE_EDIT);
        expect(activityLogResponse.data.myActivity.logs[0]?.user?.username).to.equal(userOne.username);
        expect(activityLogResponse.data.myActivity.logs[0]?.targetPackage?.identifier.catalogSlug).to.equal(
            "testOne-packages"
        );
        expect(activityLogResponse.data.myActivity.logs[0]?.targetPackage?.identifier.packageSlug).to.equal(
            "congressional-legislators"
        );
        expect(activityLogResponse.data.myActivity.logs[1]?.eventType).to.equal(
            ActivityLogEventType.PACKAGE_PUBLIC_CHANGED
        );
        expect(activityLogResponse.data.myActivity.logs[1]?.changeType).to.equal(ActivityLogChangeType.PUBLIC_ENABLED);

        const line = serverLogLines.find((l: string) =>
            findActivityLogLine(l, (activityLogLine: ActivityLogLine) => {
                return (
                    activityLogLine.eventType === ActivityLogEventType.PACKAGE_EDIT &&
                    activityLogLine.username === userOne.username &&
                    activityLogLine.targetPackageIdentifier === "testOne-packages/congressional-legislators"
                );
            })
        );

        expect(line).to.not.equal(undefined);

        const publicChangedLine = serverLogLines.find((l: string) =>
            findActivityLogLine(l, (activityLogLine: ActivityLogLine) => {
                return (
                    activityLogLine.eventType === ActivityLogEventType.PACKAGE_PUBLIC_CHANGED &&
                    activityLogLine.username === userOne.username &&
                    activityLogLine.changeType === ActivityLogChangeType.PUBLIC_ENABLED
                );
            })
        );

        expect(publicChangedLine).to.not.equal(undefined);
    });

    it("Should show COLLECTION_CREATED", async function () {
        const response = await userTwoClient.mutate({
            mutation: CreateCollectionDocument,
            variables: {
                value: {
                    collectionSlug: "activityLog",
                    name: "Activity Log Test Collection",
                    description: "This is my description"
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);

        const activityLogResponse = await userTwoClient.query({
            query: MyActivityDocument,
            variables: {
                filter: {
                    eventType: [ActivityLogEventType.COLLECTION_CREATED],
                    limit: 100,
                    offset: 0
                }
            }
        });

        expect(response.data).to.not.equal(undefined);
        expect(activityLogResponse.data.myActivity).to.not.equal(undefined);
        expect(activityLogResponse.data.myActivity.logs.length).to.equal(1);
        expect(activityLogResponse.data.myActivity.logs[0]?.eventType).to.equal(
            ActivityLogEventType.COLLECTION_CREATED
        );
        expect(activityLogResponse.data.myActivity.logs[0]?.user?.username).to.equal(userTwo.username);
        expect(activityLogResponse.data.myActivity.logs[0]?.targetCollection?.identifier.collectionSlug).to.equal(
            "activityLog"
        );

        const line = serverLogLines.find((l: string) =>
            findActivityLogLine(l, (activityLogLine: ActivityLogLine) => {
                return (
                    activityLogLine.eventType === ActivityLogEventType.COLLECTION_CREATED &&
                    activityLogLine.username === userTwo.username &&
                    activityLogLine.targetCollectionSlug === "activityLog"
                );
            })
        );

        expect(line).to.not.equal(undefined);
    });

    it("Should show PACKAGE_USER_PERMISSION_ADDED_UPDATED", async function () {
        const response = await userOneClient.mutate({
            mutation: SetPackagePermissionsDocument,
            variables: {
                identifier: {
                    catalogSlug: "testOne-packages",
                    packageSlug: "congressional-legislators"
                },
                message: "test message",
                value: {
                    permissions: [Permission.VIEW],
                    usernameOrEmailAddress: "testTwo-packages"
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);

        const activityLogResponse = await userOneClient.query({
            query: MyActivityDocument,
            variables: {
                filter: {
                    eventType: [ActivityLogEventType.PACKAGE_USER_PERMISSION_ADDED_UPDATED],
                    limit: 100,
                    offset: 0
                }
            }
        });

        expect(response.data).to.not.equal(undefined);
        expect(activityLogResponse.data.myActivity).to.not.equal(undefined);
        expect(activityLogResponse.data.myActivity.logs.length).to.equal(1);
        expect(activityLogResponse.data.myActivity.logs[0]?.eventType).to.equal(
            ActivityLogEventType.PACKAGE_USER_PERMISSION_ADDED_UPDATED
        );
        expect(activityLogResponse.data.myActivity.logs[0]?.user?.username).to.equal(userOne.username);
        expect(activityLogResponse.data.myActivity.logs[0]?.targetPackage?.identifier.catalogSlug).to.equal(
            "testOne-packages"
        );
        expect(activityLogResponse.data.myActivity.logs[0]?.targetPackage?.identifier.packageSlug).to.equal(
            "congressional-legislators"
        );
        expect(activityLogResponse.data.myActivity.logs[0]?.targetUser?.username).to.equal("testTwo-packages");
    });

    it("Should show PACKAGE_GROUP_PERMISSION_ADDED_UPDATED", async function () {
        const response = await userOneClient.mutate({
            mutation: AddOrUpdateGroupToPackageDocument,
            variables: {
                groupSlug: "test-activity-log",
                packageIdentifier: {
                    catalogSlug: "testOne-packages",
                    packageSlug: "congressional-legislators"
                },
                permissions: [Permission.VIEW]
            }
        });

        expect(response.errors == null, "no errors").equal(true);
        expect(response.data?.addOrUpdateGroupToPackage.group?.slug).to.equal("test-activity-log");

        const activityLogResponse = await userOneClient.query({
            query: MyActivityDocument,
            variables: {
                filter: {
                    eventType: [ActivityLogEventType.PACKAGE_GROUP_PERMISSION_ADDED_UPDATED],
                    limit: 100,
                    offset: 0
                }
            }
        });

        expect(response.data).to.not.equal(undefined);
        expect(activityLogResponse.data.myActivity).to.not.equal(undefined);
        expect(activityLogResponse.data.myActivity.logs.length).to.equal(1);
        expect(activityLogResponse.data.myActivity.logs[0]?.eventType).to.equal(
            ActivityLogEventType.PACKAGE_GROUP_PERMISSION_ADDED_UPDATED
        );

        expect(activityLogResponse.data.myActivity.logs[0]?.user?.username).to.equal(userOne.username);
        expect(activityLogResponse.data.myActivity.logs[0]?.targetPackage?.identifier.catalogSlug).to.equal(
            "testOne-packages"
        );
        expect(activityLogResponse.data.myActivity.logs[0]?.targetPackage?.identifier.packageSlug).to.equal(
            "congressional-legislators"
        );
        expect(activityLogResponse.data.myActivity.logs[0]?.targetGroup?.slug).to.equal("test-activity-log");
    });

    it("Should show PACKAGE_GROUP_PERMISSION_REMOVED", async function () {
        const response = await userOneClient.mutate({
            mutation: RemoveGroupFromPackageDocument,
            variables: {
                groupSlug: "test-activity-log",
                packageIdentifier: {
                    catalogSlug: "testOne-packages",
                    packageSlug: "congressional-legislators"
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);

        const activityLogResponse = await userOneClient.query({
            query: MyActivityDocument,
            variables: {
                filter: {
                    eventType: [ActivityLogEventType.PACKAGE_GROUP_PERMISSION_REMOVED],
                    limit: 100,
                    offset: 0
                }
            }
        });

        expect(response.data).to.not.equal(undefined);
        expect(activityLogResponse.data.myActivity).to.not.equal(undefined);
        expect(activityLogResponse.data.myActivity.logs.length).to.equal(1);
        expect(activityLogResponse.data.myActivity.logs[0]?.eventType).to.equal(
            ActivityLogEventType.PACKAGE_GROUP_PERMISSION_REMOVED
        );
        expect(activityLogResponse.data.myActivity.logs[0]?.user?.username).to.equal(userOne.username);
        expect(activityLogResponse.data.myActivity.logs[0]?.targetPackage?.identifier.catalogSlug).to.equal(
            "testOne-packages"
        );
        expect(activityLogResponse.data.myActivity.logs[0]?.targetPackage?.identifier.packageSlug).to.equal(
            "congressional-legislators"
        );
        expect(activityLogResponse.data.myActivity.logs[0]?.targetGroup?.slug).to.equal("test-activity-log");
    });

    it("Should show COLLECTION_USER_PERMISSION_ADDED_UPDATED", async function () {
        const response = await userTwoClient.mutate({
            mutation: SetUserCollectionPermissionsDocument,
            variables: {
                identifier: {
                    collectionSlug: "activityLog"
                },
                value: {
                    permissions: [Permission.VIEW],
                    usernameOrEmailAddress: "testOne-packages"
                },
                message: "Added testOne-packages"
            }
        });

        expect(response.errors == null, "no errors").equal(true);

        const activityLogResponse = await userTwoClient.query({
            query: MyActivityDocument,
            variables: {
                filter: {
                    eventType: [ActivityLogEventType.COLLECTION_USER_PERMISSION_ADDED_UPDATED],
                    limit: 100,
                    offset: 0
                }
            }
        });

        expect(response.data).to.not.equal(undefined);
        expect(activityLogResponse.data.myActivity).to.not.equal(undefined);
        expect(activityLogResponse.data.myActivity.logs.length).to.equal(1);
        expect(activityLogResponse.data.myActivity.logs[0]?.eventType).to.equal(
            ActivityLogEventType.COLLECTION_USER_PERMISSION_ADDED_UPDATED
        );
        expect(activityLogResponse.data.myActivity.logs[0]?.user?.username).to.equal(userTwo.username);
        expect(activityLogResponse.data.myActivity.logs[0]?.targetCollection?.identifier.collectionSlug).to.equal(
            "activityLog"
        );
        expect(activityLogResponse.data.myActivity.logs[0]?.targetUser?.username).to.equal("testOne-packages");
    });

    it("Should show COLLECTION_ADD_PACKAGE", async function () {
        const response = await userTwoClient.mutate({
            mutation: AddPackageToCollectionDocument,
            variables: {
                collectionIdentifier: {
                    collectionSlug: "activityLog"
                },
                packageIdentifier: {
                    catalogSlug: "testOne-packages",
                    packageSlug: "congressional-legislators"
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);

        const activityLogResponse = await userTwoClient.query({
            query: MyActivityDocument,
            variables: {
                filter: {
                    eventType: [ActivityLogEventType.COLLECTION_PACKAGE_ADDED],
                    limit: 100,
                    offset: 0
                }
            }
        });

        expect(response.data).to.not.equal(undefined);
        expect(activityLogResponse.data.myActivity).to.not.equal(undefined);
        expect(activityLogResponse.data.myActivity.logs.length).to.equal(1);
        expect(activityLogResponse.data.myActivity.logs[0]?.eventType).to.equal(
            ActivityLogEventType.COLLECTION_PACKAGE_ADDED
        );
        expect(activityLogResponse.data.myActivity.logs[0]?.user?.username).to.equal(userTwo.username);
        expect(activityLogResponse.data.myActivity.logs[0]?.targetCollection?.identifier.collectionSlug).to.equal(
            "activityLog"
        );
        expect(activityLogResponse.data.myActivity.logs[0]?.targetPackage?.identifier.catalogSlug).to.equal(
            "testOne-packages"
        );
        expect(activityLogResponse.data.myActivity.logs[0]?.targetPackage?.identifier.packageSlug).to.equal(
            "congressional-legislators"
        );

        const line = serverLogLines.find((l: string) =>
            findActivityLogLine(l, (activityLogLine: ActivityLogLine) => {
                return (
                    activityLogLine.eventType === ActivityLogEventType.COLLECTION_PACKAGE_ADDED &&
                    activityLogLine.username === userTwo.username &&
                    activityLogLine.targetCollectionSlug === "activityLog" &&
                    activityLogLine.targetPackageIdentifier === "testOne-packages/congressional-legislators"
                );
            })
        );

        expect(line).to.not.equal(undefined);

        const userOneActivityResponse = await userOneClient.query({
            query: PackageActivitiesDocument,
            variables: {
                identifier: {
                    catalogSlug: "testOne-packages",
                    packageSlug: "congressional-legislators"
                },
                filter: {
                    eventType: [ActivityLogEventType.COLLECTION_PACKAGE_ADDED],
                    limit: 100,
                    offset: 0
                }
            }
        });

        expect(response.data).to.not.equal(undefined);
        expect(userOneActivityResponse.data.packageActivities).to.not.equal(undefined);
        expect(userOneActivityResponse.data.packageActivities.logs.length).to.equal(1);
        expect(userOneActivityResponse.data.packageActivities.logs[0]?.eventType).to.equal(
            ActivityLogEventType.COLLECTION_PACKAGE_ADDED
        );
        expect(userOneActivityResponse.data.packageActivities.logs[0]?.user?.username).to.equal(userTwo.username);
        expect(
            userOneActivityResponse.data.packageActivities.logs[0]?.targetCollection?.identifier.collectionSlug
        ).to.equal("activityLog");
        expect(userOneActivityResponse.data.packageActivities.logs[0]?.targetCollection?.name).to.equal(
            "Activity Log Test Collection"
        );
        expect(userOneActivityResponse.data.packageActivities.logs[0]?.targetPackage?.identifier.catalogSlug).to.equal(
            "testOne-packages"
        );
        expect(userOneActivityResponse.data.packageActivities.logs[0]?.targetPackage?.identifier.packageSlug).to.equal(
            "congressional-legislators"
        );
    });

    it("Should show PACKAGE_VIEWED for package owner and viewer", async function () {
        const response = await userTwoClient.mutate({
            mutation: PackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testOne-packages",
                    packageSlug: "congressional-legislators"
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);
        expect(response.data).to.not.equal(undefined);

        const activityLogResponse = await userTwoClient.query({
            query: MyActivityDocument,
            variables: {
                filter: {
                    eventType: [ActivityLogEventType.PACKAGE_VIEWED],
                    limit: 100,
                    offset: 0
                }
            }
        });

        expect(activityLogResponse.data.myActivity).to.not.equal(undefined);
        expect(activityLogResponse.data.myActivity.logs.length).to.equal(1);
        expect(activityLogResponse.data.myActivity.logs[0]?.eventType).to.equal(ActivityLogEventType.PACKAGE_VIEWED);
        expect(activityLogResponse.data.myActivity.logs[0]?.user?.username).to.equal(userTwo.username);
        expect(activityLogResponse.data.myActivity.logs[0]?.targetPackage?.identifier.catalogSlug).to.equal(
            "testOne-packages"
        );
        expect(activityLogResponse.data.myActivity.logs[0]?.targetPackage?.identifier.packageSlug).to.equal(
            "congressional-legislators"
        );

        const line = serverLogLines.find((l: string) =>
            findActivityLogLine(l, (activityLogLine: ActivityLogLine) => {
                return (
                    activityLogLine.eventType === ActivityLogEventType.PACKAGE_VIEWED &&
                    activityLogLine.username === userTwo.username &&
                    activityLogLine.targetPackageIdentifier === "testOne-packages/congressional-legislators"
                );
            })
        );

        expect(line).to.not.equal(undefined);

        const userOneActivity = await userOneClient.query({
            query: PackageActivitiesDocument,
            variables: {
                identifier: {
                    catalogSlug: "testOne-packages",
                    packageSlug: "congressional-legislators"
                },
                filter: {
                    eventType: [ActivityLogEventType.PACKAGE_VIEWED],
                    limit: 100,
                    offset: 0
                }
            }
        });

        expect(response.data).to.not.equal(undefined);
        expect(userOneActivity.data.packageActivities).to.not.equal(undefined);
        expect(userOneActivity.data.packageActivities.logs.length).to.equal(1);
        expect(userOneActivity.data.packageActivities.logs[0]?.eventType).to.equal(ActivityLogEventType.PACKAGE_VIEWED);
        expect(userOneActivity.data.packageActivities.logs[0]?.user?.username).to.equal(userTwo.username);
        expect(userOneActivity.data.packageActivities.logs[0]?.targetPackage?.identifier.catalogSlug).to.equal(
            "testOne-packages"
        );
        expect(userOneActivity.data.packageActivities.logs[0]?.targetPackage?.identifier.packageSlug).to.equal(
            "congressional-legislators"
        );
    });

    it("Should show PACKAGE_FETCHED", async function () {
        const response = await userTwoClient.mutate({
            mutation: PackageFetchedDocument,
            variables: {
                identifier: {
                    catalogSlug: "testOne-packages",
                    packageSlug: "congressional-legislators",
                    versionMajor: 1,
                    versionMinor: 0,
                    versionPatch: 0
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);
        expect(response.data).to.not.equal(undefined);

        const activityLogResponse = await userTwoClient.query({
            query: MyActivityDocument,
            variables: {
                filter: {
                    eventType: [ActivityLogEventType.PACKAGE_FETCHED],
                    limit: 100,
                    offset: 0
                }
            }
        });

        expect(activityLogResponse.data.myActivity).to.not.equal(undefined);
        expect(activityLogResponse.data.myActivity.logs.length).to.equal(1);
        expect(activityLogResponse.data.myActivity.logs[0]?.eventType).to.equal(ActivityLogEventType.PACKAGE_FETCHED);
        expect(activityLogResponse.data.myActivity.logs[0]?.user?.username).to.equal(userTwo.username);
        expect(activityLogResponse.data.myActivity.logs[0]?.targetPackage?.identifier.catalogSlug).to.equal(
            "testOne-packages"
        );
        expect(activityLogResponse.data.myActivity.logs[0]?.targetPackage?.identifier.packageSlug).to.equal(
            "congressional-legislators"
        );

        const line = serverLogLines.find((l: string) =>
            findActivityLogLine(l, (activityLogLine: ActivityLogLine) => {
                return (
                    activityLogLine.eventType === ActivityLogEventType.PACKAGE_FETCHED &&
                    activityLogLine.username === userTwo.username &&
                    activityLogLine.targetPackageIdentifier === "testOne-packages/congressional-legislators"
                );
            })
        );

        expect(line).to.not.equal(undefined);

        const userOneActivity = await userOneClient.query({
            query: PackageActivitiesDocument,
            variables: {
                identifier: {
                    catalogSlug: "testOne-packages",
                    packageSlug: "congressional-legislators"
                },
                filter: {
                    eventType: [ActivityLogEventType.PACKAGE_FETCHED],
                    limit: 100,
                    offset: 0
                }
            }
        });

        expect(response.data).to.not.equal(undefined);
        expect(userOneActivity.data.packageActivities).to.not.equal(undefined);
        expect(userOneActivity.data.packageActivities.logs.length).to.equal(1);
        expect(userOneActivity.data.packageActivities.logs[0]?.eventType).to.equal(
            ActivityLogEventType.PACKAGE_FETCHED
        );
        expect(userOneActivity.data.packageActivities.logs[0]?.user?.username).to.equal(userTwo.username);
        expect(userOneActivity.data.packageActivities.logs[0]?.targetPackage?.identifier.catalogSlug).to.equal(
            "testOne-packages"
        );
        expect(userOneActivity.data.packageActivities.logs[0]?.targetPackage?.identifier.packageSlug).to.equal(
            "congressional-legislators"
        );
    });

    it("Should show COLLECTION_REMOVE_PACKAGE", async function () {
        const response = await userTwoClient.mutate({
            mutation: RemovePackageFromCollectionDocument,
            variables: {
                collectionIdentifier: {
                    collectionSlug: "activityLog"
                },
                packageIdentifier: {
                    catalogSlug: "testOne-packages",
                    packageSlug: "congressional-legislators"
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);

        const activityLogResponse = await userTwoClient.query({
            query: MyActivityDocument,
            variables: {
                filter: {
                    eventType: [ActivityLogEventType.COLLECTION_PACKAGE_REMOVED],
                    limit: 100,
                    offset: 0
                }
            }
        });

        expect(response.data).to.not.equal(undefined);
        expect(activityLogResponse.data.myActivity).to.not.equal(undefined);
        expect(activityLogResponse.data.myActivity.logs.length).to.equal(1);
        expect(activityLogResponse.data.myActivity.logs[0]?.eventType).to.equal(
            ActivityLogEventType.COLLECTION_PACKAGE_REMOVED
        );
        expect(activityLogResponse.data.myActivity.logs[0]?.user?.username).to.equal(userTwo.username);
        expect(activityLogResponse.data.myActivity.logs[0]?.targetCollection?.identifier.collectionSlug).to.equal(
            "activityLog"
        );
        expect(activityLogResponse.data.myActivity.logs[0]?.targetPackage?.identifier.catalogSlug).to.equal(
            "testOne-packages"
        );
        expect(activityLogResponse.data.myActivity.logs[0]?.targetPackage?.identifier.packageSlug).to.equal(
            "congressional-legislators"
        );

        const line = serverLogLines.find((l: string) =>
            findActivityLogLine(l, (activityLogLine: ActivityLogLine) => {
                return (
                    activityLogLine.eventType === ActivityLogEventType.COLLECTION_PACKAGE_REMOVED &&
                    activityLogLine.username === userTwo.username &&
                    activityLogLine.targetCollectionSlug === "activityLog" &&
                    activityLogLine.targetPackageIdentifier === "testOne-packages/congressional-legislators"
                );
            })
        );

        expect(line).to.not.equal(undefined);
    });

    it("Should show COLLECTION_EDIT", async function () {
        const response = await userTwoClient.mutate({
            mutation: UpdateCollectionDocument,
            variables: {
                identifier: {
                    collectionSlug: "activityLog"
                },
                value: {
                    description: "updated descriptions",
                    isPublic: true
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);

        const activityLogResponse = await userTwoClient.query({
            query: MyActivityDocument,
            variables: {
                filter: {
                    eventType: [ActivityLogEventType.COLLECTION_EDIT],
                    limit: 100,
                    offset: 0
                }
            }
        });

        expect(response.data).to.not.equal(undefined);
        expect(activityLogResponse.data.myActivity).to.not.equal(undefined);
        expect(activityLogResponse.data.myActivity.logs.length).to.equal(1);
        expect(activityLogResponse.data.myActivity.logs[0]?.eventType).to.equal(ActivityLogEventType.COLLECTION_EDIT);
        expect(activityLogResponse.data.myActivity.logs[0]?.user?.username).to.equal(userTwo.username);
        expect(activityLogResponse.data.myActivity.logs[0]?.targetCollection?.identifier.collectionSlug).to.equal(
            "activityLog"
        );
        expect(activityLogResponse.data.myActivity.logs[0]?.propertiesEdited).to.contain("isPublic");
        expect(activityLogResponse.data.myActivity.logs[0]?.propertiesEdited).to.contain("description");

        const line = serverLogLines.find((l: string) =>
            findActivityLogLine(l, (activityLogLine: ActivityLogLine) => {
                if (activityLogLine.propertiesEdited == null) {
                    return false;
                }

                return (
                    activityLogLine.eventType === ActivityLogEventType.COLLECTION_EDIT &&
                    activityLogLine.username === userTwo.username &&
                    activityLogLine.targetCollectionSlug === "activityLog" &&
                    activityLogLine.propertiesEdited.includes("isPublic") &&
                    activityLogLine.propertiesEdited.includes("description")
                );
            })
        );

        expect(line).to.not.equal(undefined);
    });

    it("Should show PACKAGE_USER_PERMISSION_REMOVED", async function () {
        const response = await userOneClient.mutate({
            mutation: RemovePackagePermissionsDocument,
            variables: {
                identifier: {
                    catalogSlug: "testOne-packages",
                    packageSlug: "congressional-legislators"
                },
                usernameOrEmailAddress: "testTwo-packages"
            }
        });

        expect(response.errors == null, "no errors").equal(true);

        const activityLogResponse = await userOneClient.query({
            query: MyActivityDocument,
            variables: {
                filter: {
                    eventType: [ActivityLogEventType.PACKAGE_USER_PERMISSION_REMOVED],
                    limit: 100,
                    offset: 0
                }
            }
        });

        expect(response.data).to.not.equal(undefined);
        expect(activityLogResponse.data.myActivity).to.not.equal(undefined);
        expect(activityLogResponse.data.myActivity.logs.length).to.equal(1);
        expect(activityLogResponse.data.myActivity.logs[0]?.eventType).to.equal(
            ActivityLogEventType.PACKAGE_USER_PERMISSION_REMOVED
        );
        expect(activityLogResponse.data.myActivity.logs[0]?.user?.username).to.equal(userOne.username);
        expect(activityLogResponse.data.myActivity.logs[0]?.targetPackage?.identifier.catalogSlug).to.equal(
            "testOne-packages"
        );
        expect(activityLogResponse.data.myActivity.logs[0]?.targetPackage?.identifier.packageSlug).to.equal(
            "congressional-legislators"
        );
        expect(activityLogResponse.data.myActivity.logs[0]?.targetUser?.username).to.equal("testTwo-packages");
    });

    it("Should show COLLECTION_DELETE", async function () {
        const response = await userTwoClient.mutate({
            mutation: DeleteCollectionDocument,
            variables: {
                identifier: {
                    collectionSlug: "activityLog"
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);

        const line = serverLogLines.find((l: string) =>
            findActivityLogLine(l, (activityLogLine: ActivityLogLine) => {
                return (
                    activityLogLine.eventType === ActivityLogEventType.COLLECTION_DELETED &&
                    activityLogLine.username === userTwo.username &&
                    activityLogLine.targetCollectionSlug === "activityLog"
                );
            })
        );

        expect(line).to.not.equal(undefined);
    });

    it("Should show VERSION_DELETE", async function () {
        const response = await userOneClient.mutate({
            mutation: DeleteVersionDocument,
            variables: {
                identifier: {
                    catalogSlug: "testOne-packages",
                    packageSlug: "congressional-legislators",
                    versionMajor: 1,
                    versionMinor: 0,
                    versionPatch: 0
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);

        await new Promise((resolve) => setTimeout(() => resolve(null), 500)); // pause for console log to catch up

        const line = serverLogLines.find((l: string) =>
            findActivityLogLine(l, (activityLogLine: ActivityLogLine) => {
                return (
                    activityLogLine.eventType === ActivityLogEventType.VERSION_DELETED &&
                    activityLogLine.username === userOne.username &&
                    activityLogLine.targetPackageIdentifier === "testOne-packages/congressional-legislators" &&
                    activityLogLine.targetVersionNumber === "1.0.0"
                );
            })
        );

        expect(line).to.not.equal(undefined);
    });

    it("Should show PACKAGE_DELETE", async function () {
        const response = await userOneClient.mutate({
            mutation: DeletePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testOne-packages",
                    packageSlug: "congressional-legislators"
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);

        await new Promise((resolve) => setTimeout(() => resolve(null), 500)); // pause for console log to catch up

        const line = serverLogLines.find((l: string) =>
            findActivityLogLine(l, (activityLogLine: ActivityLogLine) => {
                return (
                    activityLogLine.eventType === ActivityLogEventType.PACKAGE_DELETED &&
                    activityLogLine.username === userOne.username &&
                    activityLogLine.targetPackageIdentifier === "testOne-packages/congressional-legislators" &&
                    activityLogLine.targetCatalogSlug === "testOne-packages"
                );
            })
        );

        expect(line).to.not.equal(undefined);

        expect(
            serverLogLines.find((l: string) =>
                findActivityLogLine(l, (activityLogLine: ActivityLogLine) => {
                    return (
                        activityLogLine.eventType === ActivityLogEventType.CATALOG_PACKAGE_REMOVED &&
                        activityLogLine.targetCatalogSlug === "testOne-packages"
                    );
                })
            )
        ).to.not.equal(undefined);
    });

    it("Should show CATALOG_DELETED", async function () {
        const deleteCatalogResponse = await userOneClient.mutate({
            mutation: DeleteCatalogDocument,
            variables: {
                identifier: {
                    catalogSlug: "testOne-packages-catalog2"
                }
            }
        });

        expect(deleteCatalogResponse.errors == null).to.equal(true);

        expect(
            serverLogLines.find((l: string) =>
                findActivityLogLine(l, (activityLogLine: ActivityLogLine) => {
                    return (
                        activityLogLine.eventType === ActivityLogEventType.CATALOG_DELETED &&
                        activityLogLine.username === userOne.username &&
                        activityLogLine.targetCatalogSlug === "testOne-packages-catalog2"
                    );
                })
            )
        ).to.not.equal(undefined);
    });

    it("Should show GROUP_MEMBER_DELETED", async function () {
        const response = await userOneClient.mutate({
            mutation: RemoveUserFromGroupDocument,
            variables: {
                groupSlug: "test-activity-log",
                username: "testTwo-packages"
            }
        });

        expect(response.errors == null, "no errors").equal(true);

        expect(
            serverLogLines.find((l: string) =>
                findActivityLogLine(l, (activityLogLine: ActivityLogLine) => {
                    return (
                        activityLogLine.eventType === ActivityLogEventType.GROUP_MEMBER_REMOVED &&
                        activityLogLine.username === userOne.username &&
                        activityLogLine.targetGroupSlug === "test-activity-log" &&
                        activityLogLine.targetUsername === "testTwo-packages"
                    );
                })
            )
        ).to.not.equal(undefined);
    });

    it("Should show GROUP_DELETED", async function () {
        const deleteGroupResponse = await userOneClient.mutate({
            mutation: DeleteGroupDocument,
            variables: {
                groupSlug: "test-activity-log"
            }
        });

        expect(deleteGroupResponse.errors == null).to.equal(true);

        expect(
            serverLogLines.find((l: string) =>
                findActivityLogLine(l, (activityLogLine: ActivityLogLine) => {
                    return (
                        activityLogLine.eventType === ActivityLogEventType.GROUP_DELETED &&
                        activityLogLine.username === userOne.username &&
                        activityLogLine.targetGroupSlug === "test-activity-log"
                    );
                })
            )
        ).to.not.equal(undefined);
    });

    it("Should not return create package for user B", async function () {
        const response = await userTwoClient.query({
            query: MyActivityDocument,
            variables: { filter: { eventType: [ActivityLogEventType.PACKAGE_CREATED], limit: 100, offset: 0 } }
        });

        expect(response.data).to.not.equal(undefined);
        expect(response.data.myActivity).to.not.equal(undefined);
        expect(response.data.myActivity.logs?.length).to.equal(0);
    });
});
