import { expect } from "chai";
import { addRegistry, getRegistryConfigs, resetConfiguration } from "../../src/util/ConfigUtil";
import { RegistryClient } from "datapm-client-lib";
import { registryServerPort } from "./setup";
import { createApiKey, createTestUser, testCmd, TestResults } from "./test-utils";

describe("Catalogs Command Tests", async function () {
    before(() => {
        //
    });

    after(() => {
        resetConfiguration();
    });

    it("Warning if no registries added yet", async function () {
        resetConfiguration();

        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd("catalogs", [], [], async (line: string) => {
            console.log(line);
            if (line.includes("You are not logged in to any registries")) {
                results.messageFound = true;
            }
        });

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found warning message").equals(true);
    });

    it("Can't list catalogs for invalid registries", async function () {
        resetConfiguration();
        addRegistry({ url: "invalid" });

        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd("catalogs", [], [], async (line: string) => {
            if (line.includes("Only absolute URLs are supported")) {
                results.messageFound = true;
            }
        });

        expect(cmdResult.code, "Exit code").equals(1);
        expect(results.messageFound, "Found error message").equals(true);
    });

    it("Can't list catalogs for non-existing registries", async function () {
        resetConfiguration();
        addRegistry({ url: "https://test.datapm.xyz" });

        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd("catalogs", [], [], async (line: string) => {
            if (line.includes("ENOTFOUND")) {
                results.messageFound = true;
            }
        });

        expect(cmdResult.code, "Exit code").equals(1);
        expect(results.messageFound, "Found error message").equals(true);
    });

    it("Can't list catalogs for non-registries", async function () {
        resetConfiguration();
        addRegistry({ url: "https://google.com" });

        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd("catalogs", [], [], async (line: string) => {
            if (line.includes("Unexpected token < in JSON at position 0")) {
                results.messageFound = true;
            }
        });

        expect(cmdResult.code, "Exit code").equals(1);
        expect(results.messageFound, "Found error message").equals(true);
    });

    it("Can't list catalogs for registries without API keys", async function () {
        resetConfiguration();
        addRegistry({ url: `http://localhost:${registryServerPort}` });

        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd("catalogs", [], [], async (line: string) => {
            if (line.includes("NOT_AUTHENTICATED")) {
                results.messageFound = true;
            }
        });

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found error message").equals(true);
    });

    it("List catalogs", async function () {
        resetConfiguration();
        const userAClient = await createTestUser();
        const apiKey = await createApiKey(userAClient);
        addRegistry({
            url: `http://localhost:${registryServerPort}`,
            apiKey: apiKey
        });
        const registries = getRegistryConfigs();
        const registryClient = new RegistryClient(registries[0]);
        const { data } = await registryClient.getCatalogs();

        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd("catalogs", [], [], async (line: string) => {
            if (line.includes(data.myCatalogs[0].displayName as string)) {
                results.messageFound = true;
            }
        });

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found success message").equals(true);
    });
});
