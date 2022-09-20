import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";
import { createUser } from "./test-utils";
import {
    CreatePackageDocument,
    ActivityLogEventType,
    CreateCatalogDocument,
    SaveFollowDocument,
    NotificationFrequency,
    MyFollowingActivityDocument,
    DeletePackageDocument,
    CreateVersionDocument,
    UpdatePackageDocument
} from "./registry-client";
import { expect } from "chai";
import { loadPackageFileFromDisk } from "datapm-lib";

describe("Following Catalogs Activity Log Tests", async () => {
    const userOneUsername = "FollowOneCatalog";
    const userTwoUsername = "FollowTwoCatalog";

    let userOneClient: ApolloClient<NormalizedCacheObject>;
    let userTwoClient: ApolloClient<NormalizedCacheObject>;

    before(async () => {
        userOneClient = await createUser(
            "FirstOne",
            "LastOne",
            userOneUsername,
            "testOne-fol-ctg@test.datapm.io",
            "passwordOne!"
        );
        userTwoClient = await createUser(
            "FirstTwo",
            "LastTwo",
            userTwoUsername,
            "testTwo-fol-ctg@test.datapm.io",
            "passwordTwo!"
        );
    });

    it("Followed catalog shows CATALOG_PACKAGE_ADDED log", async function () {
        const catalogSlug = "usr-fol-sdx-ctg";
        const packageSlug = "usr-fol-sdx-pkg";

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

        await userOneClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    catalog: {
                        catalogSlug
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
            (l) => ActivityLogEventType.CATALOG_PACKAGE_ADDED === l.eventType
        );
        if (!createdLog || !createdLog.user || !createdLog.targetPackage || !createdLog.targetCatalog) {
            expect(true).equal(false, "Should've returned created following activity with log data");
            return;
        }

        const targetPackageIdentifier = createdLog.targetPackage.identifier;
        expect(createdLog.user.username).to.equal(userTwoUsername);
        expect(targetPackageIdentifier.catalogSlug).to.equal(catalogSlug);
        expect(targetPackageIdentifier.packageSlug).to.equal(packageSlug);

        const targetCatalogIdentifier = createdLog.targetCatalog.identifier;
        expect(targetCatalogIdentifier.catalogSlug).to.equal(catalogSlug);
    });

    it("Followed catalog shows CATALOG_PACKAGE_REMOVED log", async function () {
        const catalogSlug = "usr-fol-dlt-ctg";
        const packageSlug = "usr-fol-dlt-pkg";

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
            mutation: DeletePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: catalogSlug,
                    packageSlug: packageSlug
                }
            }
        });

        await userOneClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    catalog: {
                        catalogSlug
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
            (l) => ActivityLogEventType.CATALOG_PACKAGE_REMOVED === l.eventType
        );
        if (!createdLog || !createdLog.user || !createdLog.targetCatalog) {
            expect(true).equal(false, "Should've returned created following activity with log data");
            return;
        }

        expect(createdLog.user.username).to.equal(userTwoUsername);

        const targetCatalogIdentifier = createdLog.targetCatalog.identifier;
        expect(targetCatalogIdentifier.catalogSlug).to.equal(catalogSlug);
    });
});
