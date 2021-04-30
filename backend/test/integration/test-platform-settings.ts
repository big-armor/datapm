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
    let anonymousUserClient = createAnonymousClient();

    before(async () => {});

    it("Initialize user clients", async function () {
        adminUserClient = AdminHolder.adminClient;
        normalUserClient = await createUser(
            "FirstB",
            "LastB",
            "testB-platform-settings",
            "testB-platform-settings@test.datapm.io",
            "passwordB!"
        );
        expect(adminUserClient).to.exist;
        expect(normalUserClient).to.exist;
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

        expect(response.data).to.exist;
        expect(response.errors).to.be.undefined;
        if (response.data) {
            expect(response.data.savePlatformSettings).to.not.be.undefined;
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

        expect(response.errors).to.not.be.undefined;
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

        expect(settingsResponse.data).to.exist;
        expect(settingsResponse.errors).to.be.undefined;
        if (settingsResponse.data) {
            expect(settingsResponse.data.platformSettings).to.not.be.undefined;
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

        expect(settingsResponse.errors).to.not.be.undefined;
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

        expect(settingsResponse.data).to.exist;
        expect(settingsResponse.errors).to.be.undefined;
        if (settingsResponse.data) {
            expect(settingsResponse.data.publicPlatformSettingsByKey).to.not.be.undefined;
        }

        const anonymousUserSettingsResponse = await anonymousUserClient.query({
            query: PublicPlatformSettingsByKeyDocument,
            variables: {
                key: "my-settings"
            }
        });

        expect(anonymousUserSettingsResponse.data).to.exist;
        expect(anonymousUserSettingsResponse.errors).to.be.undefined;
        if (anonymousUserSettingsResponse.data) {
            expect(anonymousUserSettingsResponse.data.publicPlatformSettingsByKey).to.not.be.undefined;
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
        expect(settingsResponse.data).to.be.null;
        expect(settingsResponse.errors).to.not.be.undefined;
        if (settingsResponse.errors) {
            expect(settingsResponse.errors[0].message).to.equal("PLATFORM_SETTINGS_NOT_FOUND");
        }

        const anonymousUserSettingsResponse = await anonymousUserClient.query({
            query: PublicPlatformSettingsByKeyDocument,
            variables: {
                key: "my-settings"
            }
        });

        expect(anonymousUserSettingsResponse.data).to.be.null;
        expect(anonymousUserSettingsResponse.errors).to.not.be.undefined;
        if (anonymousUserSettingsResponse.errors) {
            expect(anonymousUserSettingsResponse.errors[0].message).to.equal("PLATFORM_SETTINGS_NOT_FOUND");
        }
    });
});
