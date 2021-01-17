import { ApolloClient, gql, NormalizedCacheObject } from "@apollo/client/core";
import { createAnonymousClient, createUser } from "./test-utils";
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
    CatalogActivitiesDocument,
    CollectionActivitiesDocument,
    RemovePackageFromCollectionDocument
} from "./registry-client";
import { expect } from "chai";
import { loadPackageFileFromDisk } from "datapm-lib";

describe("Activity Log Tests", async () => {
    let userOne: any;
    let userTwo: any;
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

        userOne = userOneResponse.data!.me;
        userTwo = userTwoResponse.data!.me;

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
    });

    it("Should show USER_CREATED", async function () {
        const response = await userOneClient.query({
            query: MyActivityDocument,
            variables: { filter: { eventType: [ActivityLogEventType.USER_CREATED], limit: 100, offset: 0 } }
        });

        expect(response.data).to.exist;
        expect(response.data.myActivity).to.exist;
        expect(response.data.myActivity.logs.length).to.equal(1);
        expect(response.data.myActivity.logs[0]?.user?.username).to.equal(userOne.username);
        expect(response.data.myActivity.logs[0]?.eventType).to.equal(ActivityLogEventType.USER_CREATED);
    });

    it("Should show PACKAGE_CREATED", async function () {
        const response = await userOneClient.query({
            query: MyActivityDocument,
            variables: { filter: { eventType: [ActivityLogEventType.PACKAGE_CREATED], limit: 100, offset: 0 } }
        });

        expect(response.data).to.exist;
        expect(response.data.myActivity).to.exist;
        expect(response.data.myActivity.logs.length).to.equal(1);
        expect(response.data.myActivity.logs[0]?.user?.username).to.equal(userOne.username);
        expect(response.data.myActivity.logs[0]?.targetPackage!.identifier.catalogSlug).to.equal("testOne-packages");
        expect(response.data.myActivity.logs[0]?.targetPackage!.identifier.packageSlug).to.equal(
            "congressional-legislators"
        );
    });

    it("Should show VERSION_CREATED", async function () {
        let packageFileContents = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");

        const packageFileString = JSON.stringify(packageFileContents);

        let response = await userOneClient.mutate({
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

        expect(response.errors == null, "no errors").true;

        const activityLogResponse = await userOneClient.query({
            query: MyActivityDocument,
            variables: { filter: { eventType: [ActivityLogEventType.VERSION_CREATED], limit: 100, offset: 0 } }
        });

        expect(response.data).to.exist;
        expect(activityLogResponse.data.myActivity).to.exist;
        expect(activityLogResponse.data.myActivity.logs.length).to.equal(1);
        expect(activityLogResponse.data.myActivity.logs[0]?.eventType).to.equal(ActivityLogEventType.VERSION_CREATED);
        expect(activityLogResponse.data.myActivity.logs[0]?.user?.username).to.equal(userOne.username);
        expect(activityLogResponse.data.myActivity.logs[0]?.targetPackage!.identifier.catalogSlug).to.equal(
            "testOne-packages"
        );
        expect(activityLogResponse.data.myActivity.logs[0]?.targetPackage!.identifier.packageSlug).to.equal(
            "congressional-legislators"
        );

        const version = activityLogResponse.data.myActivity.logs[0]?.targetPackageVersion!;

        expect(version.identifier.versionMajor).to.equal(1);
        expect(version.identifier.versionMinor).to.equal(0);
        expect(version.identifier.versionPatch).to.equal(0);
    });

    it("Should show CATALOG_EDIT", async function () {
        let response = await userOneClient.mutate({
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

        expect(response.errors == null, "no errors").true;

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

        expect(response.data).to.exist;
        expect(activityLogResponse.data.myActivity).to.exist;
        expect(activityLogResponse.data.myActivity.logs.length).to.equal(2);
        expect(activityLogResponse.data.myActivity.logs[0]?.eventType).to.equal(ActivityLogEventType.CATALOG_EDIT);
        expect(activityLogResponse.data.myActivity.logs[0]?.user?.username).to.equal(userOne.username);
        expect(activityLogResponse.data.myActivity.logs[0]?.targetCatalog!.identifier.catalogSlug).to.equal(
            "testOne-packages"
        );
        expect(activityLogResponse.data.myActivity.logs[1]?.eventType).to.equal(
            ActivityLogEventType.CATALOG_PUBLIC_CHANGED
        );
        expect(activityLogResponse.data.myActivity.logs[1]?.changeType).to.equal(ActivityLogChangeType.PUBLIC_ENABLED);
    });

    it("Should show PACKAGE_EDIT", async function () {
        let response = await userOneClient.mutate({
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

        expect(response.errors == null, "no errors").true;

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

        expect(response.data).to.exist;
        expect(activityLogResponse.data.myActivity).to.exist;
        expect(activityLogResponse.data.myActivity.logs.length).to.equal(2);
        expect(activityLogResponse.data.myActivity.logs[0]?.eventType).to.equal(ActivityLogEventType.PACKAGE_EDIT);
        expect(activityLogResponse.data.myActivity.logs[0]?.user?.username).to.equal(userOne.username);
        expect(activityLogResponse.data.myActivity.logs[0]?.targetPackage!.identifier.catalogSlug).to.equal(
            "testOne-packages"
        );
        expect(activityLogResponse.data.myActivity.logs[0]?.targetPackage!.identifier.packageSlug).to.equal(
            "congressional-legislators"
        );
        expect(activityLogResponse.data.myActivity.logs[1]?.eventType).to.equal(
            ActivityLogEventType.PACKAGE_PUBLIC_CHANGED
        );
        expect(activityLogResponse.data.myActivity.logs[1]?.changeType).to.equal(ActivityLogChangeType.PUBLIC_ENABLED);
    });

    it("Should show COLLECTION_CREATED", async function () {
        let response = await userTwoClient.mutate({
            mutation: CreateCollectionDocument,
            variables: {
                value: {
                    collectionSlug: "activityLog",
                    name: "Activity Log Test Collection",
                    description: "This is my description"
                }
            }
        });

        expect(response.errors == null, "no errors").true;

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

        expect(response.data).to.exist;
        expect(activityLogResponse.data.myActivity).to.exist;
        expect(activityLogResponse.data.myActivity.logs.length).to.equal(1);
        expect(activityLogResponse.data.myActivity.logs[0]?.eventType).to.equal(
            ActivityLogEventType.COLLECTION_CREATED
        );
        expect(activityLogResponse.data.myActivity.logs[0]?.user?.username).to.equal(userTwo.username);
        expect(activityLogResponse.data.myActivity.logs[0]?.targetCollection!.identifier.collectionSlug).to.equal(
            "activityLog"
        );
    });

    it("Should show COLLECTION_ADD_PACKAGE", async function () {
        let response = await userTwoClient.mutate({
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

        expect(response.errors == null, "no errors").true;

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

        expect(response.data).to.exist;
        expect(activityLogResponse.data.myActivity).to.exist;
        expect(activityLogResponse.data.myActivity.logs.length).to.equal(1);
        expect(activityLogResponse.data.myActivity.logs[0]?.eventType).to.equal(
            ActivityLogEventType.COLLECTION_PACKAGE_ADDED
        );
        expect(activityLogResponse.data.myActivity.logs[0]?.user?.username).to.equal(userTwo.username);
        expect(activityLogResponse.data.myActivity.logs[0]?.targetCollection!.identifier.collectionSlug).to.equal(
            "activityLog"
        );
        expect(activityLogResponse.data.myActivity.logs[0]?.targetPackage!.identifier.catalogSlug).to.equal(
            "testOne-packages"
        );
        expect(activityLogResponse.data.myActivity.logs[0]?.targetPackage!.identifier.packageSlug).to.equal(
            "congressional-legislators"
        );

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

        expect(response.data).to.exist;
        expect(userOneActivityResponse.data.packageActivities).to.exist;
        expect(userOneActivityResponse.data.packageActivities.logs.length).to.equal(1);
        expect(userOneActivityResponse.data.packageActivities.logs[0]?.eventType).to.equal(
            ActivityLogEventType.COLLECTION_PACKAGE_ADDED
        );
        expect(userOneActivityResponse.data.packageActivities.logs[0]?.user?.username).to.equal(userTwo.username);
        expect(
            userOneActivityResponse.data.packageActivities.logs[0]?.targetCollection!.identifier.collectionSlug
        ).to.equal("private");
        expect(userOneActivityResponse.data.packageActivities.logs[0]?.targetCollection!.name).to.equal("private");
        expect(userOneActivityResponse.data.packageActivities.logs[0]?.targetPackage!.identifier.catalogSlug).to.equal(
            "testOne-packages"
        );
        expect(userOneActivityResponse.data.packageActivities.logs[0]?.targetPackage!.identifier.packageSlug).to.equal(
            "congressional-legislators"
        );
    });

    it("Should show PACKAGE_VIEWED for package owner and viewer", async function () {
        let response = await userTwoClient.mutate({
            mutation: PackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testOne-packages",
                    packageSlug: "congressional-legislators"
                }
            }
        });

        expect(response.errors == null, "no errors").true;
        expect(response.data).to.exist;

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

        expect(activityLogResponse.data.myActivity).to.exist;
        expect(activityLogResponse.data.myActivity.logs.length).to.equal(1);
        expect(activityLogResponse.data.myActivity.logs[0]?.eventType).to.equal(ActivityLogEventType.PACKAGE_VIEWED);
        expect(activityLogResponse.data.myActivity.logs[0]?.user?.username).to.equal(userTwo.username);
        expect(activityLogResponse.data.myActivity.logs[0]?.targetPackage!.identifier.catalogSlug).to.equal(
            "testOne-packages"
        );
        expect(activityLogResponse.data.myActivity.logs[0]?.targetPackage!.identifier.packageSlug).to.equal(
            "congressional-legislators"
        );

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

        expect(response.data).to.exist;
        expect(userOneActivity.data.packageActivities).to.exist;
        expect(userOneActivity.data.packageActivities.logs.length).to.equal(1);
        expect(userOneActivity.data.packageActivities.logs[0]?.eventType).to.equal(ActivityLogEventType.PACKAGE_VIEWED);
        expect(userOneActivity.data.packageActivities.logs[0]?.user?.username).to.equal(userTwo.username);
        expect(userOneActivity.data.packageActivities.logs[0]?.targetPackage!.identifier.catalogSlug).to.equal(
            "testOne-packages"
        );
        expect(userOneActivity.data.packageActivities.logs[0]?.targetPackage!.identifier.packageSlug).to.equal(
            "congressional-legislators"
        );
    });

    it("Should show PACKAGE_FETCHED", async function () {
        let response = await userTwoClient.mutate({
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

        expect(response.errors == null, "no errors").true;
        expect(response.data).to.exist;

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

        expect(activityLogResponse.data.myActivity).to.exist;
        expect(activityLogResponse.data.myActivity.logs.length).to.equal(1);
        expect(activityLogResponse.data.myActivity.logs[0]?.eventType).to.equal(ActivityLogEventType.PACKAGE_FETCHED);
        expect(activityLogResponse.data.myActivity.logs[0]?.user?.username).to.equal(userTwo.username);
        expect(activityLogResponse.data.myActivity.logs[0]?.targetPackage!.identifier.catalogSlug).to.equal(
            "testOne-packages"
        );
        expect(activityLogResponse.data.myActivity.logs[0]?.targetPackage!.identifier.packageSlug).to.equal(
            "congressional-legislators"
        );

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

        expect(response.data).to.exist;
        expect(userOneActivity.data.packageActivities).to.exist;
        expect(userOneActivity.data.packageActivities.logs.length).to.equal(1);
        expect(userOneActivity.data.packageActivities.logs[0]?.eventType).to.equal(
            ActivityLogEventType.PACKAGE_FETCHED
        );
        expect(userOneActivity.data.packageActivities.logs[0]?.user?.username).to.equal(userTwo.username);
        expect(userOneActivity.data.packageActivities.logs[0]?.targetPackage!.identifier.catalogSlug).to.equal(
            "testOne-packages"
        );
        expect(userOneActivity.data.packageActivities.logs[0]?.targetPackage!.identifier.packageSlug).to.equal(
            "congressional-legislators"
        );
    });

    it("Should show COLLECTION_REMOVE_PACKAGE", async function () {
        let response = await userTwoClient.mutate({
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

        expect(response.errors == null, "no errors").true;

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

        expect(response.data).to.exist;
        expect(activityLogResponse.data.myActivity).to.exist;
        expect(activityLogResponse.data.myActivity.logs.length).to.equal(1);
        expect(activityLogResponse.data.myActivity.logs[0]?.eventType).to.equal(
            ActivityLogEventType.COLLECTION_PACKAGE_REMOVED
        );
        expect(activityLogResponse.data.myActivity.logs[0]?.user?.username).to.equal(userTwo.username);
        expect(activityLogResponse.data.myActivity.logs[0]?.targetCollection!.identifier.collectionSlug).to.equal(
            "activityLog"
        );
        expect(activityLogResponse.data.myActivity.logs[0]?.targetPackage!.identifier.catalogSlug).to.equal(
            "testOne-packages"
        );
        expect(activityLogResponse.data.myActivity.logs[0]?.targetPackage!.identifier.packageSlug).to.equal(
            "congressional-legislators"
        );
    });

    it("Should not return create package for user B", async function () {
        const response = await userTwoClient.query({
            query: MyActivityDocument,
            variables: { filter: { eventType: [ActivityLogEventType.PACKAGE_CREATED], limit: 100, offset: 0 } }
        });

        expect(response.data).to.exist;
        expect(response.data.myActivity).to.exist;
        expect(response.data.myActivity.logs?.length).to.equal(0);
    });
});
