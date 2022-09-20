import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";
import { expect } from "chai";
import { loadPackageFileFromDisk } from "datapm-lib";
import { AdminHolder } from "./admin-holder";
import {
    ActivityLogChangeType,
    CreateCatalogDocument,
    CreatePackageDocument,
    CreateVersionDocument,
    DeleteFollowDocument,
    JobType,
    NotificationFrequency,
    RunJobDocument,
    SaveFollowDocument,
    UpdatePackageDocument
} from "./registry-client";
import { mailObservable } from "./setup";
import { createUser } from "./test-utils";

describe("Follow Catalog's Packages Notifications Tests", async () => {
    const userAUsername = "follow-ctg-packages-user-a";
    const userBUsername = "follow-ctg-packages-user-b";

    let userAClient: ApolloClient<NormalizedCacheObject>;
    let userBClient: ApolloClient<NormalizedCacheObject>;

    const userASecondCatalogSlug = "user-a-ctg-packages-2";
    const userAPackageSlug = "follow-test";

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

    it("Should allow user A to create a new catalog", async () => {
        const catalogResponse = await userAClient.mutate({
            mutation: CreateCatalogDocument,
            variables: {
                value: {
                    displayName: "User A second catalog",
                    isPublic: true,
                    slug: userASecondCatalogSlug
                }
            }
        });

        expect(catalogResponse.errors).to.be.equal(undefined);
    });

    it("Should allow user B to follow second catalog", async () => {
        const followResponse = await userBClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    catalog: {
                        catalogSlug: userASecondCatalogSlug
                    },
                    followAllPackages: true,
                    notificationFrequency: NotificationFrequency.INSTANT,
                    changeType: [ActivityLogChangeType.VERSION_FIRST_VERSION]
                }
            }
        });

        expect(followResponse.errors).to.be.equal(undefined);
    });

    it("Should allow user A to create a package", async () => {
        const createPackageResponse = await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: userASecondCatalogSlug,
                    packageSlug: userAPackageSlug,
                    displayName: "Congressional LegislatorsA",
                    description: "Test move of congressional legislatorsA"
                }
            }
        });

        expect(createPackageResponse.errors).to.equal(undefined);

        const packageFileContents = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");
        const packageFileString = JSON.stringify(packageFileContents);

        const createVersionResponse = await userAClient.mutate({
            mutation: CreateVersionDocument,
            variables: {
                identifier: {
                    catalogSlug: userASecondCatalogSlug,
                    packageSlug: userAPackageSlug
                },
                value: {
                    packageFile: packageFileString
                }
            }
        });
        expect(createVersionResponse.errors).to.equal(undefined);
    });

    it("Should allow user A to update package", async () => {
        await userAClient.mutate({
            mutation: UpdatePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: userASecondCatalogSlug,
                    packageSlug: userAPackageSlug
                },
                value: {
                    isPublic: true
                }
            }
        });
    });

    it("Should send email after instant notification updates containing packages followed through catalog", async () => {
        let userBEmail: { text: string } = { text: "notset" };

        const emailPromise = new Promise<void>((resolve, reject) => {
            const subscription = mailObservable.subscribe((email) => {
                if (email.to[0].address === userBUsername + "@test.datapm.io") {
                    userBEmail = email;
                }

                if (userBEmail) {
                    subscription.unsubscribe();
                    resolve();
                }
            });
        });

        const response = await AdminHolder.adminClient.mutate({
            mutation: RunJobDocument,
            variables: {
                key: "TEST_JOB_KEY",
                job: JobType.INSTANT_NOTIFICATIONS
            }
        });

        expect(response.errors).eq(undefined);

        await emailPromise;
        expect(userBEmail.text).to.contain("This is your instant");
        expect(userBEmail.text).to.contain("added package user-a-ctg-packages-2/follow-test");
        expect(userBEmail.text).to.contain("follow-ctg-packages-user-a published version 1.0.0");
        expect(userBEmail.text).to.contain("http://localhost:4200/follow-ctg-packages-user-b#user-following");
    });

    it("Should allow user A to create patch version change", async () => {
        const packageFileContents = loadPackageFileFromDisk(
            "test/packageFiles/congressional-legislators-version-changed.datapm.json"
        );
        const packageFileString = JSON.stringify(packageFileContents);

        const createVersionResponse = await userAClient.mutate({
            mutation: CreateVersionDocument,
            variables: {
                identifier: {
                    catalogSlug: userASecondCatalogSlug,
                    packageSlug: userAPackageSlug
                },
                value: {
                    packageFile: packageFileString
                }
            }
        });
        expect(createVersionResponse.errors).to.equal(undefined);
    });

    it("Should allow user B to unfollow and follow collection", async () => {
        const unfollowResponse = await userBClient.mutate({
            mutation: DeleteFollowDocument,
            variables: {
                follow: {
                    catalog: {
                        catalogSlug: userASecondCatalogSlug
                    }
                }
            }
        });

        expect(unfollowResponse.errors).to.be.equal(undefined);

        const followResponse = await userBClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    catalog: {
                        catalogSlug: userASecondCatalogSlug
                    },
                    followAllPackages: true,
                    notificationFrequency: NotificationFrequency.DAILY,
                    changeType: [ActivityLogChangeType.VERSION_MINOR_CHANGE, ActivityLogChangeType.VERSION_MAJOR_CHANGE]
                }
            }
        });

        expect(followResponse.errors).to.be.equal(undefined);
    });

    it("Should send email after daily notification updates not containing package because of the following options selected", async () => {
        let userBEmail: { text: string } = { text: "notset" };

        const emailPromise = new Promise<void>((resolve, reject) => {
            const subscription = mailObservable.subscribe((email) => {
                if (email.to[0].address === userBUsername + "@test.datapm.io") {
                    userBEmail = email;
                    subscription.unsubscribe();
                    resolve();
                }
            });
        });

        const response = await AdminHolder.adminClient.mutate({
            mutation: RunJobDocument,
            variables: {
                key: "TEST_JOB_KEY",
                job: JobType.DAILY_NOTIFICATIONS
            }
        });

        expect(response.errors).eq(undefined);

        await emailPromise;

        expect(userBEmail.text).to.contain("This is your daily");
        expect(userBEmail.text).to.not.contain("follow-ctg-packages-user-a published version 1.0.0");
        expect(userBEmail.text).to.contain("http://localhost:4200/follow-ctg-packages-user-b#user-following");
    });

    it("Should allow user A to create major version change", async () => {
        const packageFileContents = loadPackageFileFromDisk(
            "test/packageFiles/congressional-legislators-updated.datapm.json"
        );
        const packageFileString = JSON.stringify(packageFileContents);

        const createVersionResponse = await userAClient.mutate({
            mutation: CreateVersionDocument,
            variables: {
                identifier: {
                    catalogSlug: userASecondCatalogSlug,
                    packageSlug: userAPackageSlug
                },
                value: {
                    packageFile: packageFileString
                }
            }
        });
        expect(createVersionResponse.errors).to.equal(undefined);
    });

    it("Should allow user B to unfollow and follow collection", async () => {
        const unfollowResponse = await userBClient.mutate({
            mutation: DeleteFollowDocument,
            variables: {
                follow: {
                    catalog: {
                        catalogSlug: userASecondCatalogSlug
                    }
                }
            }
        });

        expect(unfollowResponse.errors).to.be.equal(undefined);

        const followResponse = await userBClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    catalog: {
                        catalogSlug: userASecondCatalogSlug
                    },
                    followAllPackages: true,
                    notificationFrequency: NotificationFrequency.WEEKLY,
                    changeType: [ActivityLogChangeType.VERSION_MAJOR_CHANGE]
                }
            }
        });

        expect(followResponse.errors).to.be.equal(undefined);
    });

    it("Should send email after daily notification updates containing package because of major change", async () => {
        let userBEmail: { text: string } = { text: "notset" };

        const emailPromise = new Promise<void>((resolve, reject) => {
            const subscription = mailObservable.subscribe((email) => {
                if (email.to[0].address === userBUsername + "@test.datapm.io") {
                    userBEmail = email;
                    subscription.unsubscribe();
                    resolve();
                }
            });
        });

        const response = await AdminHolder.adminClient.mutate({
            mutation: RunJobDocument,
            variables: {
                key: "TEST_JOB_KEY",
                job: JobType.WEEKLY_NOTIFICATIONS
            }
        });

        expect(response.errors).eq(undefined);

        await emailPromise;

        expect(userBEmail.text).to.contain("This is your weekly");
        expect(userBEmail.text).to.contain("follow-ctg-packages-user-a published version 2.0.0");
        expect(userBEmail.text).to.contain("http://localhost:4200/follow-ctg-packages-user-b#user-following");
    });
});
