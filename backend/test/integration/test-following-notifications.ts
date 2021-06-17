import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";
import { expect } from "chai";
import { loadPackageFileFromDisk } from "../../../lib/dist/src/PackageUtil";
import { AdminHolder } from "./admin-holder";
import {
    CreateCatalogDocument,
    CreatePackageDocument,
    CreateVersionDocument,
    JobType,
    NotificationFrequency,
    RunJobDocument,
    SaveFollowDocument
} from "./registry-client";
import { mailObservable } from "./setup";
import { createUser } from "./test-utils";

describe("Follow Tests", async () => {
    const userAUsername = "follow-notification-user-a";
    const userBUsername = "follow-notification-user-b";

    let userAClient: ApolloClient<NormalizedCacheObject>;
    let userBClient: ApolloClient<NormalizedCacheObject>;

    const userASecondCatalogSlug = "user-a-follow-notification-2";
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
        expect(userAClient).to.exist;
        expect(userBClient).to.exist;
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

        let packageFileContents = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");
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

    it("Should send email after instant notification updates", async () => {
        let userBEmail: any = null;

        let verifyEmailPromise = new Promise<void>((r) => {
            let subscription = mailObservable.subscribe((email) => {
                if (email.to[0].address === userBUsername + "@test.datapm.io") userBEmail = email;

                if (userBEmail) {
                    subscription.unsubscribe();
                    r();
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

        await verifyEmailPromise.then(() => {
            expect(userBEmail.text).to.contain("published  user-a-follow-notification-2/follow-test  version 1.0.0\n");
            expect(userBEmail.text).to.contain("http://localhost:4200/follow-notification-user-b#user-following");
        });
    });

    it("Should send email after daily notification updates", async () => {
        let userBEmail: any = null;

        let verifyEmailPromise = new Promise<void>((r) => {
            let subscription = mailObservable.subscribe((email) => {
                if (email.to[0].address === userBUsername + "@test.datapm.io") userBEmail = email;

                if (userBEmail) {
                    subscription.unsubscribe();
                    r();
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
            expect(userBEmail.text).to.contain("published  user-a-follow-notification-2/follow-test  version 1.0.0\n");
            expect(userBEmail.text).to.contain("http://localhost:4200/follow-notification-user-b#user-following");
        });
    });
});
