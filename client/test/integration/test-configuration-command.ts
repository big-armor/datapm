import { expect } from "chai";
import { addRegistry, getRegistryConfigs, resetConfiguration } from "../../src/util/ConfigUtil";
import { registryServerPort } from "./setup";
import { testCmd, TestResults } from "./test-utils";

describe("Configuration Command Tests", async function () {
    before(async () => {
        addRegistry({ url: `http://localhost:${registryServerPort}` });
    });

    after(() => {
        resetConfiguration();
    });

    it("Show configuration", async function () {
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd("configuration", ["show"], [], async (line: string) => {
            if (line.includes(`registries: [ { url: 'http://localhost:${registryServerPort}' } ]`)) {
                results.messageFound = true;
            }
        });

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found success message").equals(true);
    });

    it("Reset configuration", async function () {
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd("configuration", ["reset"], [], async (line: string) => {
            if (line.includes("has been reset")) {
                results.messageFound = true;
            }
        });

        const registries = getRegistryConfigs();

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found success message").equals(true);
        expect(registries.length, "Registry count").equals(0);
    });
});
