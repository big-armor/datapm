import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";
import { expect } from "chai";
import { getRegistryConfigs, resetConfiguration } from "../../src/util/ConfigUtil";
import { registryServerPort } from "./setup";
import { createApiKey, createTestUser, testCmd, TestResults } from "./test-utils";

describe("Registry Command Tests", async function () {
    before(async () => {
        resetConfiguration();
    });

    after(() => {
        resetConfiguration();
    });

    it("Shouldn't add registry with missing or invalid arguments", async function () {
        await testCmd("registry", ["add"]);

        await testCmd("registry", ["add", "localhost", "--port", "invalid-port"]);

        await testCmd("registry", ["add", "localhost", "--protocol", "invalid-protocol"]);

        const registries = getRegistryConfigs();

        expect(registries.length).equal(0);
    });

    it("Add registry A", async function () {
        const userAClient: ApolloClient<NormalizedCacheObject> = await createTestUser();
        const apiKey = await createApiKey(userAClient);

        await testCmd("registry", ["add", `http://localhost:${registryServerPort}`, apiKey]);

        const registries = getRegistryConfigs();

        expect(registries.length).equal(1);
        expect(registries[0].url).equal(`http://localhost:${registryServerPort}`);
        expect(registries[0].apiKey).equal(apiKey);
    });

    it("Add registry A again", async function () {
        const userAClient: ApolloClient<NormalizedCacheObject> = await createTestUser();
        const apiKey = await createApiKey(userAClient);

        await testCmd("registry", ["add", `http://localhost:${registryServerPort}`, apiKey]);

        const registries = getRegistryConfigs();

        expect(registries.length).equal(1);
        expect(registries[0].url).equal(`http://localhost:${registryServerPort}`);
        expect(registries[0].apiKey).equal(apiKey);
    });

    it("Add registry B", async function () {
        const userAClient: ApolloClient<NormalizedCacheObject> = await createTestUser();
        const apiKey = await createApiKey(userAClient);

        await testCmd("registry", ["add", `http://127.0.0.1:${registryServerPort}`, apiKey], []);

        const registries = getRegistryConfigs();

        expect(registries.length).equal(2);
        expect(registries[0].url).equal(`http://localhost:${registryServerPort}`);
        expect(registries[1].url).equal(`http://127.0.0.1:${registryServerPort}`);
        expect(registries[1].apiKey).equal(apiKey);
    });

    it("List registries", async function () {
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd("registry", ["list"], [], async (line: string) => {
            if (line.includes("localhost:" + registryServerPort)) {
                results.messageFound = true;
            }
        });

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found success message").equals(true);
    });

    it("Can't remove registry with non-existing url", async function () {
        await testCmd("registry", ["remove", "non-existing-url"]);

        const registries = getRegistryConfigs();

        expect(registries.length).equal(2);
    });

    it("Remove registry A", async function () {
        await testCmd("registry", ["remove", `http://localhost:${registryServerPort}`]);

        const registries = getRegistryConfigs();

        expect(registries.length).equal(1);
    });

    it("Remove registry B", async function () {
        await testCmd("registry", ["remove", `http://127.0.0.1:${registryServerPort}`]);

        const registries = getRegistryConfigs();

        expect(registries.length).equal(0);
    });
});
