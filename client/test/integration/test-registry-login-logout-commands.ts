import { expect } from "chai";
import { MeDocument } from "datapm-client-lib";
import { getRegistryConfigs, resetConfiguration } from "../../src/util/ConfigUtil";
import { registryServerPort } from "./setup";
import { createUser, testCmd } from "./test-utils";
import os from "os";

describe("Registry Command Tests", async function () {
    before(async () => {
        resetConfiguration();
    });

    after(() => {
        //
    });

    it("Create user C", async function () {
        const userCClient = await createUser(
            "user",
            "Collins",
            "testRegistry-userC",
            "testRegistry-userC@test.datapm.io",
            "passwordC!"
        );

        const meResponse = await userCClient.query({
            query: MeDocument
        });

        expect(meResponse.errors == null).equal(true);

        const messagesFound = { authenticated: false };
        const exitCode = await testCmd(
            "registry",
            ["login", `http://localhost:${registryServerPort}`, "testRegistry-userC", "passwordC!"],
            [],
            async (line) => {
                if (line.includes("will now be authenticated as user")) messagesFound.authenticated = true;
            }
        );

        expect(exitCode.code).equal(0);
        expect(messagesFound.authenticated).equal(true);
    });

    it("Should error for invalid URL", async function () {
        const messagesFound = { errorFound: false };
        const exitCode = await testCmd("registry", ["login", "invalid-url"], [], async (line) => {
            if (line.includes("Only absolute URLs are supported")) messagesFound.errorFound = true;
        });
        expect(exitCode.code).equal(1);
        expect(messagesFound.errorFound).equal(true);
    });

    it("Should login and save API Key", async function () {
        const messagesFound = {
            authenticated: false,
            existingApiKeyFound: false,
            savedKey: false
        };

        const exitCode = await testCmd(
            "registry",
            ["login"],
            [
                {
                    message: "Registry URL?",
                    input: `http://localhost:${registryServerPort}\n`
                },
                {
                    message: "Username or Email Address",
                    input: "testRegistry-userC\n"
                },
                {
                    message: "Password",
                    input: "passwordC!\n"
                },
                {
                    message: "An API Key named '" + os.hostname() + "' already exists. Delete it?",
                    input: "y\n"
                }
            ],
            async (line) => {
                if (line.includes("Authenticated")) messagesFound.authenticated = true;
                else if (line.includes("Found an existing API Key named")) messagesFound.existingApiKeyFound = true;
                else if (line.includes("Created and saved new API Key")) messagesFound.savedKey = true;
            }
        );

        expect(exitCode.code).equal(0);
        expect(messagesFound.authenticated).equal(true);
        expect(messagesFound.existingApiKeyFound).equal(true);
        expect(messagesFound.savedKey).equal(true);
    });

    it("Should logout and remove the API key ", async function () {
        const messagesFound = {
            deletedAPIKey: false,
            removedAPIKey: false
        };

        const exitCode = await testCmd(
            "registry",
            ["logout"],
            [
                {
                    message: "Registry URL?",
                    input: `http://localhost:${registryServerPort}\n`
                }
            ],
            async (line) => {
                if (line.includes("Deleted API Key from registry")) messagesFound.deletedAPIKey = true;
                else if (line.includes("Removed local copy of API key")) messagesFound.removedAPIKey = true;
            }
        );

        expect(exitCode.code).equal(0);
        expect(messagesFound.deletedAPIKey).equal(true);
        expect(messagesFound.removedAPIKey).equal(true);

        const registries = getRegistryConfigs();

        expect(registries.length).equal(0);
    });

    it("Should fail login", async function () {
        const messagesFound = {
            authenticationFailed: false
        };

        const exitCode = await testCmd(
            "registry",
            ["login"],
            [
                {
                    message: "Registry URL?",
                    input: `http://localhost:${registryServerPort}\n`
                },
                {
                    message: "Username or Email Address",
                    input: "testRegistry-userC\n"
                },
                {
                    message: "Password",
                    input: "wrongPassword1\n"
                }
            ],
            async (line) => {
                if (line.includes("Authentication failed")) messagesFound.authenticationFailed = true;
            }
        );

        expect(exitCode.code).equal(1);
        expect(messagesFound.authenticationFailed).equal(true);
    });
});
