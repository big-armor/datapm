import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";
import { expect } from "chai";
import { loadPackageFileFromDisk } from "datapm-lib";
import { AdminHolder } from "./admin-holder";
import {
    AddPackageToCollectionDocument,
    CreateCatalogDocument,
    CreateCollectionDocument,
    CreatePackageDocument,
    CreateVersionDocument,
    JobType,
    NotificationFrequency,
    RunJobDocument,
    SaveFollowDocument,
    UpdatePackageDocument
} from "./registry-client";
import { MailDevEmail, mailObservable, tempMailDevEmail } from "./setup";
import { createUser } from "./test-utils";

describe("Follow Tests", async () => {
    const userAUsername = "follow-notification-user-a";
    const userBUsername = "follow-notification-user-b";

    let userAClient: ApolloClient<NormalizedCacheObject>;
    let userBClient: ApolloClient<NormalizedCacheObject>;

    const userASecondCatalogSlug = "user-a-follow-notification-2";
    const userAPackageSlug = "follow-test";
    const collectionSlug = "user-a-follow-test-collection";

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

    it("Should allow user A to create a new collection", async () => {
        const collectionResponse = await userAClient.mutate({
            mutation: CreateCollectionDocument,
            variables: {
                value: {
                    collectionSlug: collectionSlug,
                    name: "User A follow Test Collection",
                    description: "test",
                    isPublic: true
                }
            }
        });

        expect(collectionResponse.errors).to.be.equal(undefined);
    });

    it("Should allow user B to follow user A", async () => {
        const followResponse = await userBClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    user: {
                        username: userAUsername
                    },
                    notificationFrequency: NotificationFrequency.INSTANT
                }
            }
        });

        expect(followResponse.errors).to.be.equal(undefined);
    });

    it("Should allow user B to follow second catalog", async () => {
        const followResponse = await userBClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    catalog: {
                        catalogSlug: userASecondCatalogSlug
                    },
                    notificationFrequency: NotificationFrequency.DAILY
                }
            }
        });
        expect(followResponse.errors).to.be.equal(undefined);
    });

    it("Should allow user B to follow collection", async () => {
        const followResponse = await userBClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    collection: {
                        collectionSlug: collectionSlug
                    },
                    notificationFrequency: NotificationFrequency.WEEKLY
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

    it("Should allow user A to make package public", async () => {
        const response = await userAClient.mutate({
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
        expect(response.errors).to.be.equal(undefined);
    });

    it("Should allow user B to follow package", async () => {
        const followResponse = await userBClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    package: {
                        catalogSlug: userASecondCatalogSlug,
                        packageSlug: userAPackageSlug
                    },
                    notificationFrequency: NotificationFrequency.HOURLY
                }
            }
        });
        expect(followResponse.errors).to.be.equal(undefined);
    });

    it("Should allow user A to create a new package version", async () => {
        const packageFileContents = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");
        packageFileContents.readmeMarkdown = "A new readme value";
        packageFileContents.version = "1.0.1";
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

    it("Should allow user A to add package to collection", async () => {
        const response = await userAClient.mutate({
            mutation: AddPackageToCollectionDocument,
            variables: {
                packageIdentifier: {
                    catalogSlug: userASecondCatalogSlug,
                    packageSlug: userAPackageSlug
                },
                collectionIdentifier: {
                    collectionSlug
                }
            }
        });

        expect(response.errors).to.equal(undefined);
    });

    it("Should send email after instant notification updates", async () => {
        let userBEmail: MailDevEmail = tempMailDevEmail;

        const verifyEmailPromise = new Promise<void>((resolve, reject) => {
            const subscription = mailObservable.subscribe((email) => {
                if (email.to[0].address === userBUsername + "@test.datapm.io") userBEmail = email;

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

        await verifyEmailPromise;

        if (userBEmail == null) throw new Error("User B email was not received");
        expect(userBEmail.text).to.contain("This is your instant");
        expect(userBEmail.text).to.contain("published  user-a-follow-notification-2/follow-test  version 1.0.0\n");
        expect(userBEmail.text).to.contain("http://localhost:4200/follow-notification-user-b#user-following");
    });

    it("Should send email after daily notification updates", async () => {
        let userBEmail: MailDevEmail = tempMailDevEmail;

        const verifyEmailPromise = new Promise<void>((resolve, reject) => {
            const subscription = mailObservable.subscribe((email) => {
                if (email.to[0].address === userBUsername + "@test.datapm.io") userBEmail = email;

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
                job: JobType.DAILY_NOTIFICATIONS
            }
        });

        expect(response.errors).eq(undefined);

        await verifyEmailPromise.then(() => {
            expect(userBEmail.text).to.contain("This is your daily");
            expect(userBEmail.text).to.contain("Catalogs that have changed");
            expect(userBEmail.text).to.contain(
                "follow-notification-user-a added package user-a-follow-notification-2/follow-test"
            );
        });
    });

    it("Should send email after hourly notification updates", async () => {
        let userBEmail: MailDevEmail = tempMailDevEmail;

        const verifyEmailPromise = new Promise<void>((resolve, reject) => {
            const subscription = mailObservable.subscribe((email) => {
                if (email.to[0].address === userBUsername + "@test.datapm.io") userBEmail = email;

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
                job: JobType.HOURLY_NOTIFICATIONS
            }
        });

        expect(response.errors).eq(undefined);

        await verifyEmailPromise.then(() => {
            expect(userBEmail.text).to.contain("This is your hourly");
            expect(userBEmail.text).to.contain("Packages that have changed");
            expect(userBEmail.text).to.contain("follow-notification-user-a published version 1.0.1");
        });
    });

    it("Should send email after weekly notification updates", async () => {
        let userBEmail: MailDevEmail = tempMailDevEmail;

        const verifyEmailPromise = new Promise<void>((resolve, reject) => {
            const subscription = mailObservable.subscribe((email) => {
                if (email.to[0].address === userBUsername + "@test.datapm.io") userBEmail = email;

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
                job: JobType.WEEKLY_NOTIFICATIONS
            }
        });

        expect(response.errors).eq(undefined);

        await verifyEmailPromise.then(() => {
            expect(userBEmail.text).to.contain("his is your weekly");
            expect(userBEmail.text).to.contain("Collections that have changed:");
            expect(userBEmail.text).to.contain(
                "follow-notification-user-a added package user-a-follow-notification-2/follow-test"
            );
        });
    });
});
