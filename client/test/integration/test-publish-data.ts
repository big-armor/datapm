import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";
import { expect } from "chai";
import { addRegistry, resetConfiguration } from "../../src/util/ConfigUtil";
import { registryServerPort } from "./setup";
import {
    createApiKey,
    createTestPackage,
    createUser,
    getPromptInputs,
    removePackageFiles,
    testCmd,
    TestResults,
    TEST_SOURCE_FILES
} from "./test-utils";
import fs from "fs";

const publishCommandPrompts = ["Target registry?", "Catalog short name?", "Data Access Method?", "Is the above ok?"];

const getPublishCommandPromptInputs = (inputs?: string[], skip = 0, count = 20) =>
    getPromptInputs(publishCommandPrompts, inputs, skip, count);

const fetchCommandPrompts = ["Destination?", "File Format?", "File Location?"];

const getFetchCommandPromptInputs = (inputs?: string[], skip = 0) => getPromptInputs(fetchCommandPrompts, inputs, skip);

describe("Publish Packge & Data Tests", async function () {
    let apiKey = "";
    let packageAFilePath = "";

    let userAClient: ApolloClient<NormalizedCacheObject>;

    before(async () => {
        resetConfiguration();
        userAClient = await createUser(
            "User",
            "A",
            "test-publish-data-A",
            `test-publish-data-A@test.datapm.io`,
            "passwordA!"
        );

        apiKey = await createApiKey(userAClient);
        addRegistry({
            url: `http://localhost:${registryServerPort}`,
            apiKey
        });

        packageAFilePath = await createTestPackage(TEST_SOURCE_FILES.HTTP1, true);
    });

    after(() => {
        removePackageFiles(["state-codes"]);
        resetConfiguration();

        if (fs.existsSync("tmp-files")) fs.rmdirSync("tmp-files", { recursive: true });
        resetConfiguration();
    });

    it("Publish package and Data", async function () {
        const prompts = getPublishCommandPromptInputs([
            `http://localhost:${registryServerPort}`,
            "test-publish-data-A",
            "Publish schema and data to registry"
        ]);
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "publish",
            [packageAFilePath],
            prompts,
            async (line: string, promptIndex: number) => {
                if (
                    promptIndex === prompts.length &&
                    line.includes("Share the command below to fetch the data in this package")
                ) {
                    results.messageFound = true;
                }
            }
        );

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found success message").equals(true);
    });

    it("Should download the data", async function () {
        const prompts = getFetchCommandPromptInputs(["Local", "JSON", "tmp-files"]);
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "fetch",
            [`http://localhost:${registryServerPort}/test-publish-data-A/state-codes`],
            prompts,
            async (line: string) => {
                if (line.includes("Finished writing 51 records")) {
                    results.messageFound = true;
                }
            }
        );

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found success message").equals(true);

        const content = fs.readFileSync("tmp-files/state-codes.json").toString();
        const firstRecord = JSON.parse(content.split("\n")[0]);
        // eslint-disable-next-line no-unused-expressions
        expect(firstRecord["State Code"]).equal("AL");
        // eslint-disable-next-line no-unused-expressions
        expect(firstRecord["State Name"]).equal("Alabama");
    });
});
