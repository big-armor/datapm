import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";
import { expect } from "chai";
import {
    PlatformSettingsDocument,
    PublicPlatformSettingsByKeyDocument,
    SavePlatformSettingsDocument
} from "./registry-client";
import { createAnonymousClient, createUser } from "./test-utils";
import { AdminHolder } from "./admin-holder";

describe("Platform Settings Tests", async () => {
    let adminUserClient: ApolloClient<NormalizedCacheObject>;
    let normalUserClient: ApolloClient<NormalizedCacheObject>;
    const anonymousUserClient = createAnonymousClient();

    it("Initialize user clients", async function () {
        adminUserClient = AdminHolder.adminClient;
        normalUserClient = await createUser(
            "FirstB",
            "LastB",
            "testB-platform-settings",
            "testB-platform-settings@test.datapm.io",
            "passwordB!"
        );
        expect(adminUserClient).to.not.equal(undefined);
        expect(normalUserClient).to.not.equal(undefined);
    });

    it("Should allow admin to save platform settings", async function () {
        const response = await adminUserClient.mutate({
            mutation: SavePlatformSettingsDocument,
            variables: {
                settings: {
                    isPublic: false,
                    key: "my-settings",
                    serializedSettings: '{ "platformName": "DataPM" }'
                }
            }
        });

        expect(response.data).to.not.equal(undefined);
        expect(response.errors).to.equal(undefined);
        if (response.data) {
            expect(response.data.savePlatformSettings).to.not.equal(undefined);
        }
    });

    it("Should not allow non-admin users to save platform settings", async function () {
        const response = await normalUserClient.mutate({
            mutation: SavePlatformSettingsDocument,
            variables: {
                settings: {
                    isPublic: false,
                    key: "my-settings",
                    serializedSettings: '{ "platformName": "DataPM" }'
                }
            }
        });

        expect(response.errors).to.not.equal(undefined);
        if (response.errors) {
            expect(response.errors[0].message).to.equal("NOT_AUTHORIZED");
        }
    });

    it("Should allow admin users to fetch all platform settings", async function () {
        await adminUserClient.mutate({
            mutation: SavePlatformSettingsDocument,
            variables: {
                settings: {
                    isPublic: false,
                    key: "my-settings",
                    serializedSettings: '{ "platformName": "DataPM" }'
                }
            }
        });

        const settingsResponse = await adminUserClient.query({
            query: PlatformSettingsDocument
        });

        expect(settingsResponse.data).to.not.equal(undefined);
        expect(settingsResponse.errors).to.equal(undefined);
        if (settingsResponse.data) {
            expect(settingsResponse.data.platformSettings).to.not.equal(undefined);
        }
    });

    it("Should not allow non-admin users to fetch all platform settings", async function () {
        await adminUserClient.mutate({
            mutation: SavePlatformSettingsDocument,
            variables: {
                settings: {
                    isPublic: false,
                    key: "my-settings",
                    serializedSettings: '{ "platformName": "DataPM" }'
                }
            }
        });

        const settingsResponse = await normalUserClient.query({
            query: PlatformSettingsDocument
        });

        expect(settingsResponse.errors).to.not.equal(undefined);
        if (settingsResponse.errors) {
            expect(settingsResponse.errors[0].message).to.equal("NOT_AUTHORIZED");
        }
    });

    it("Should allow registered and unauthenticated users to access public platform settings", async function () {
        await adminUserClient.mutate({
            mutation: SavePlatformSettingsDocument,
            variables: {
                settings: {
                    isPublic: true,
                    key: "my-settings",
                    serializedSettings: '{ "platformName": "DataPM" }'
                }
            }
        });

        const settingsResponse = await normalUserClient.query({
            query: PublicPlatformSettingsByKeyDocument,
            variables: {
                key: "my-settings"
            }
        });

        expect(settingsResponse.data).to.not.equal(undefined);
        expect(settingsResponse.errors).to.equal(undefined);
        if (settingsResponse.data) {
            expect(settingsResponse.data.publicPlatformSettingsByKey).to.not.equal(undefined);
        }

        const anonymousUserSettingsResponse = await anonymousUserClient.query({
            query: PublicPlatformSettingsByKeyDocument,
            variables: {
                key: "my-settings"
            }
        });

        expect(anonymousUserSettingsResponse.data).to.not.equal(undefined);
        expect(anonymousUserSettingsResponse.errors).to.equal(undefined);
        if (anonymousUserSettingsResponse.data) {
            expect(anonymousUserSettingsResponse.data.publicPlatformSettingsByKey).to.not.equal(undefined);
        }
    });

    it("Should not allow registered and unauthenticated users to access private platform settings", async function () {
        await adminUserClient.mutate({
            mutation: SavePlatformSettingsDocument,
            variables: {
                settings: {
                    isPublic: false,
                    key: "my-settings",
                    serializedSettings: '{ "platformName": "DataPM" }'
                }
            }
        });

        const settingsResponse = await normalUserClient.query({
            query: PublicPlatformSettingsByKeyDocument,
            variables: {
                key: "my-settings"
            }
        });
        expect(settingsResponse.data).to.equal(null);
        expect(settingsResponse.errors).to.not.equal(undefined);
        if (settingsResponse.errors) {
            expect(settingsResponse.errors[0].message).to.equal("PLATFORM_SETTINGS_NOT_FOUND");
        }

        const anonymousUserSettingsResponse = await anonymousUserClient.query({
            query: PublicPlatformSettingsByKeyDocument,
            variables: {
                key: "my-settings"
            }
        });

        expect(anonymousUserSettingsResponse.data).to.equal(null);
        expect(anonymousUserSettingsResponse.errors).to.not.equal(undefined);
        if (anonymousUserSettingsResponse.errors) {
            expect(anonymousUserSettingsResponse.errors[0].message).to.equal("PLATFORM_SETTINGS_NOT_FOUND");
        }
    });
});
