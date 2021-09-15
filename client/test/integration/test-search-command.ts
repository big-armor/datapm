import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";
import { expect } from "chai";
import { addRegistry, resetConfiguration } from "../../src/util/ConfigUtil";
import { registryServerPort } from "./setup";
import {
    createApiKey,
    createTestPackage,
    createTestUser,
    removePackageFiles,
    testCmd,
    TestResults,
    KEYS,
    TEST_SOURCE_FILES
} from "./test-utils";

describe("Search Command Tests", async function () {
    before(async () => {
        const userAClient: ApolloClient<NormalizedCacheObject> = await createTestUser();
        const apiKey = await createApiKey(userAClient);
        addRegistry({
            url: `http://localhost:${registryServerPort}`,
            apiKey
        });

        await createTestPackage(TEST_SOURCE_FILES.FILE1, false, "package-a", "Package A", "", [
            {
                message: "What does each covid-02-01-2020 record represent?",
                input: KEYS.ENTER
            },
            {
                message: "Do you want to specify units for the 3 number properties?",
                input: "n" + KEYS.ENTER
            }
        ]);
    });

    after(() => {
        removePackageFiles(["package-a"]);
        removePackageFiles(["covid-02-01-2020"]);

        resetConfiguration();
    });

    it("Can't search package from non-existing registry", async function () {
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd("search", ["keyword", "--registry", "unknown"], [], async (line: string) => {
            if (line.includes("Invalid values:")) {
                results.messageFound = true;
            }
        });

        expect(cmdResult.code, "Exit code").equals(1);
        expect(results.messageFound, "Found error message").equals(true);
    });

    it("No search result", async function () {
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd("search", ["unknown"], [], async (line: string) => {
            if (line.includes("No matching packages found")) {
                results.messageFound = true;
            }
        });

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found warning message").equals(true);
    });

    it("Search package", async function () {
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd("search", ["package"], [], async (line: string) => {
            if (line.includes("Found 1 results")) {
                results.messageFound = true;
            }
        });

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found success message").equals(true);
    });
});
