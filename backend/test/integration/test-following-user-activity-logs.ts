import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";
import { createUser } from "./test-utils";
import {
    CreatePackageDocument,
    SaveFollowDocument,
    NotificationFrequency,
    MyFollowingActivityDocument,
    DeleteFollowDocument,
    ActivityLogEventType,
    CreateCatalogDocument,
    CreateVersionDocument,
    Permission,
    SetPackagePermissionsDocument,
    UpdatePackageDocument
} from "./registry-client";
import { expect } from "chai";
import { loadPackageFileFromDisk } from "datapm-lib";

describe("Following User Activity Log Tests", async () => {
    const userOneUsername = "FollowOUser";
    const userTwoUsername = "FollowTUser";

    let userOneClient: ApolloClient<NormalizedCacheObject>;
    let userTwoClient: ApolloClient<NormalizedCacheObject>;

    before(async () => {
        userOneClient = await createUser(
            "FirstOne",
            "LastOne",
            userOneUsername,
            "tstUsrOne@test.datapm.io",
            "passwordOne!"
        );
        userTwoClient = await createUser(
            "FirstTwo",
            "LastTwo",
            userTwoUsername,
            "tstUsrTwo@test.datapm.io",
            "passwordTwo!"
        );
    });

    it("Followed user doesn't show PACKAGE_CREATED event for private package", async function () {
        const follow = await userOneClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    user: {
                        username: userTwoUsername
                    },
                    notificationFrequency: NotificationFrequency.WEEKLY
                }
            }
        });

        expect(follow.errors == null).to.equal(true);

        const packageSlug = "usr-flw-wds-dwasd";
        const createPackageResponse = await userTwoClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: userTwoUsername,
                    packageSlug: packageSlug,
                    displayName: "Congressional Legislators",
                    description: "Test upload of congressional legislators"
                }
            }
        });

        expect(createPackageResponse.errors == null).to.equal(true);

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
            console.log(activitiesResponse);
            return;
        }

        console.log(activitiesResponse.data.myFollowingActivity.logs);
        expect(activitiesResponse.data.myFollowingActivity.logs.length).to.equal(0);

        const deleteFollow = await userOneClient.mutate({
            mutation: DeleteFollowDocument,
            variables: {
                follow: {
                    user: {
                        username: userTwoUsername
                    }
                }
            }
        });
        expect(deleteFollow.errors == null).to.equal(true);
    });

    it("Followed user created package shows PACKAGE_CREATED log for public package", async function () {
        const catalogSlug = "usr-pblc-ctlg";
        const packageSlug = "usr-flw-wxad-dwasd";
        const createCatalogResponse = await userTwoClient.mutate({
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
        expect(createCatalogResponse.errors == null).to.equal(true);

        const follow = await userOneClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    user: {
                        username: userTwoUsername
                    },
                    notificationFrequency: NotificationFrequency.WEEKLY
                }
            }
        });
        expect(follow.errors == null).to.equal(true);

        const createPackageResponse = await userTwoClient.mutate({
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
        expect(createPackageResponse.errors == null).to.equal(true);

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

        const updatePackageResponse = await userTwoClient.mutate({
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

        expect(updatePackageResponse.errors == null).to.equal(true);

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
            (l) => ActivityLogEventType.PACKAGE_CREATED === l.eventType
        );

        if (!createdLog || !createdLog.user || !createdLog.targetPackage) {
            expect(true).equal(false, "Should've returned created following activity with user and package data");
            return;
        }

        const targetPackageIdentifier = createdLog.targetPackage.identifier;
        expect(createdLog.user.username).to.equal(userTwoUsername);
        expect(targetPackageIdentifier.catalogSlug).to.equal(catalogSlug);
        expect(targetPackageIdentifier.packageSlug).to.equal(packageSlug);

        const deleteFollow = await userOneClient.mutate({
            mutation: DeleteFollowDocument,
            variables: {
                follow: {
                    user: {
                        username: userTwoUsername
                    }
                }
            }
        });
        expect(deleteFollow.errors == null).to.equal(true);
    });

    it("Followed user created package shows PACKAGE_CREATED log for private package with user permissions", async function () {
        const catalogSlug = "usr-pbsx-ctlg";
        const packageSlug = "usr-flw-eapd-pkg";
        const createCatalogResponse = await userTwoClient.mutate({
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
        expect(createCatalogResponse.errors == null).to.equal(true);

        const follow = await userOneClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    user: {
                        username: userTwoUsername
                    },
                    notificationFrequency: NotificationFrequency.WEEKLY
                }
            }
        });
        expect(follow.errors == null).to.equal(true);

        const createPackageResponse = await userTwoClient.mutate({
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
        expect(createPackageResponse.errors == null).to.equal(true);

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

        const addUserPermissions = await userTwoClient.mutate({
            mutation: SetPackagePermissionsDocument,
            variables: {
                identifier: {
                    catalogSlug: catalogSlug,
                    packageSlug: packageSlug
                },
                message: "Hello",
                value: [
                    {
                        usernameOrEmailAddress: userOneUsername,
                        permissions: [Permission.VIEW]
                    }
                ]
            }
        });
        expect(addUserPermissions.errors == null).to.equal(true);

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
            (l) => ActivityLogEventType.PACKAGE_CREATED === l.eventType
        );

        if (!createdLog || !createdLog.user || !createdLog.targetPackage) {
            expect(true).equal(false, "Should've returned created following activity with user and package data");
            return;
        }

        const targetPackageIdentifier = createdLog.targetPackage.identifier;
        expect(createdLog.user.username).to.equal(userTwoUsername);
        expect(targetPackageIdentifier.catalogSlug).to.equal(catalogSlug);
        expect(targetPackageIdentifier.packageSlug).to.equal(packageSlug);

        const deleteFollow = await userOneClient.mutate({
            mutation: DeleteFollowDocument,
            variables: {
                follow: {
                    user: {
                        username: userTwoUsername
                    }
                }
            }
        });
        expect(deleteFollow.errors == null).to.equal(true);
    });

    it("Followed user creates package version VERSION_CREATED log and shows it", async function () {
        const catalogSlug = "usr-dwad-ctlg";
        const packageSlug = "usr-flw-wdas-pkg";
        const createCatalogResponse = await userTwoClient.mutate({
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
        expect(createCatalogResponse.errors == null).to.equal(true);

        const follow = await userOneClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    user: {
                        username: userTwoUsername
                    },
                    notificationFrequency: NotificationFrequency.WEEKLY
                }
            }
        });
        expect(follow.errors == null).to.equal(true);

        const createPackageResponse = await userTwoClient.mutate({
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
        expect(createPackageResponse.errors == null).to.equal(true);

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

        const updatePackageResponse = await userTwoClient.mutate({
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

        expect(updatePackageResponse.errors == null).to.equal(true);

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
            (l) => ActivityLogEventType.VERSION_CREATED === l.eventType
        );

        if (!createdLog || !createdLog.user || !createdLog.targetPackage) {
            expect(true).equal(false, "Should've returned created following activity with user and package data");
            return;
        }

        const targetPackageIdentifier = createdLog.targetPackage.identifier;
        expect(createdLog.user.username).to.equal(userTwoUsername);
        expect(targetPackageIdentifier.catalogSlug).to.equal(catalogSlug);
        expect(targetPackageIdentifier.packageSlug).to.equal(packageSlug);

        const deleteFollow = await userOneClient.mutate({
            mutation: DeleteFollowDocument,
            variables: {
                follow: {
                    user: {
                        username: userTwoUsername
                    }
                }
            }
        });
        expect(deleteFollow.errors == null).to.equal(true);
    });
});
