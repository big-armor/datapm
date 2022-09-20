import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";
import { createUser } from "./test-utils";
import {
    CreatePackageDocument,
    ActivityLogEventType,
    CreateCatalogDocument,
    SaveFollowDocument,
    NotificationFrequency,
    MyFollowingActivityDocument,
    AddPackageToCollectionDocument,
    CreateCollectionDocument,
    RemovePackageFromCollectionDocument,
    CreateVersionDocument,
    UpdatePackageDocument
} from "./registry-client";
import { expect } from "chai";
import { loadPackageFileFromDisk } from "datapm-lib";

describe("Following Collections Activity Log Tests", async () => {
    const userOneUsername = "FollowOneCollection";
    const userTwoUsername = "FollowTwoCollection";

    let userOneClient: ApolloClient<NormalizedCacheObject>;
    let userTwoClient: ApolloClient<NormalizedCacheObject>;

    before(async () => {
        userOneClient = await createUser(
            "FirstOne",
            "LastOne",
            userOneUsername,
            "testOne-fol-cl@test.datapm.io",
            "passwordOne!"
        );
        userTwoClient = await createUser(
            "FirstTwo",
            "LastTwo",
            userTwoUsername,
            "testTwo-fol-cl@test.datapm.io",
            "passwordTwo!"
        );
    });

    it("Followed catalog shows COLLECTION_PACKAGE_ADDED log", async function () {
        const catalogSlug = "usr-fol-col-ctg";
        const packageSlug = "usr-fol-col-pkg";
        const collectionSlug = "usr-col-fol";

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

        await userTwoClient.mutate({
            mutation: CreateCollectionDocument,
            variables: {
                value: {
                    collectionSlug: collectionSlug,
                    name: "Congressional Legislators",
                    description: "Test upload of congressional legislators",
                    isPublic: true
                }
            }
        });

        await userTwoClient.mutate({
            mutation: AddPackageToCollectionDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug,
                    packageSlug
                },
                collectionIdentifier: {
                    collectionSlug
                }
            }
        });

        await userOneClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    collection: {
                        collectionSlug
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
            (l) => ActivityLogEventType.COLLECTION_PACKAGE_ADDED === l.eventType
        );
        if (!createdLog || !createdLog.user || !createdLog.targetPackage || !createdLog.targetCollection) {
            expect(true).equal(false, "Should've returned created following activity with log data");
            return;
        }

        const targetPackageIdentifier = createdLog.targetPackage?.identifier;
        expect(createdLog.user.username).to.equal(userTwoUsername);
        expect(targetPackageIdentifier.catalogSlug).to.equal(catalogSlug);
        expect(targetPackageIdentifier.packageSlug).to.equal(packageSlug);

        const targetCollectionIdentifier = createdLog.targetCollection?.identifier;
        expect(targetCollectionIdentifier.collectionSlug).to.equal(collectionSlug);
    });

    it("Followed catalog shows COLLECTION_PACKAGE_REMOVED log", async function () {
        const catalogSlug = "usr-fol-coldel-ctg";
        const packageSlug = "usr-fol-coldel-pkg";
        const collectionSlug = "usr-fol-wow-col";

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

        await userTwoClient.mutate({
            mutation: CreateCollectionDocument,
            variables: {
                value: {
                    collectionSlug: collectionSlug,
                    name: "Congressional Legislators",
                    description: "Test upload of congressional legislators",
                    isPublic: true
                }
            }
        });

        await userTwoClient.mutate({
            mutation: AddPackageToCollectionDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug,
                    packageSlug
                },
                collectionIdentifier: {
                    collectionSlug
                }
            }
        });

        await userTwoClient.mutate({
            mutation: RemovePackageFromCollectionDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug,
                    packageSlug
                },
                collectionIdentifier: {
                    collectionSlug
                }
            }
        });

        await userOneClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    collection: {
                        collectionSlug
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
            (l) => ActivityLogEventType.COLLECTION_PACKAGE_REMOVED === l.eventType
        );
        if (!createdLog || !createdLog.user || !createdLog.targetCollection) {
            expect(true).equal(false, "Should've returned created following activity with log data");
            return;
        }

        expect(createdLog.user.username).to.equal(userTwoUsername);

        const targetCollectionIdentifier = createdLog.targetCollection?.identifier;
        expect(targetCollectionIdentifier.collectionSlug).to.equal(collectionSlug);
    });
});
