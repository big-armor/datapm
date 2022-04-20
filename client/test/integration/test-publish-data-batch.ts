import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";
import { expect } from "chai";
import { addRegistry, removeRegistry, resetConfiguration } from "../../src/util/ConfigUtil";
import { registryServerPort } from "./setup";
import {
    createApiKey,
    createUser,
    getPromptInputs,
    KEYS,
    removePackageFiles,
    testCmd,
    TestResults,
    TEST_SOURCE_FILES
} from "./test-utils";
import fs from "fs";
import { UpdateCatalogDocument, UpdatePackageDocument } from "datapm-client-lib";

const fetchCommandPrompts = [
    "Exclude any attributes from",
    "Rename attributes from",
    "Sink Connector?",
    "File format?",
    "File Location?"
];

const getFetchCommandPromptInputs = (inputs?: string[], skip = 0) => getPromptInputs(fetchCommandPrompts, inputs, skip);

describe("Publish Data Batch Tests", async function () {
    let apiKey = "";

    let userAClient: ApolloClient<NormalizedCacheObject>;

    before(async () => {
        resetConfiguration();
        userAClient = await createUser(
            "User",
            "A",
            "test-publish-data-batch-A",
            `test-publish-data-batch-A@test.datapm.io`,
            "passwordA!"
        );

        apiKey = await createApiKey(userAClient);
        addRegistry({
            url: `http://localhost:${registryServerPort}`,
            apiKey
        });

        if (fs.existsSync("tmp-files")) fs.rmSync("tmp-files", { recursive: true });

        fs.mkdirSync("tmp-files");

        fs.copyFileSync(TEST_SOURCE_FILES.FILE19.replace("file://", ""), "tmp-files/countries.csv");
    });

    after(() => {
        removePackageFiles(["countries"]);
        resetConfiguration();

        if (fs.existsSync("tmp-files")) fs.rmSync("tmp-files", { recursive: true });
        resetConfiguration();
    });

    it("Create Package & publish data as batch", async function () {
        const prompts = [
            {
                message: "Is there a header line above?",
                input: KEYS.ENTER
            },
            {
                message: "Header row line number?",
                input: KEYS.ENTER
            },
            {
                message: "How are files updated?",
                input: "Edits are made throughout" + KEYS.ENTER
            },
            {
                message: "Exclude any attributes",
                input: KEYS.ENTER
            },
            {
                message: "Rename attributes",
                input: KEYS.ENTER
            },
            {
                message: "derived from other 'upstream data'?",
                input: KEYS.ENTER
            },

            {
                message: "What does each countries record represent?",
                input: "country" + KEYS.ENTER
            },
            {
                message: "Unit for attribute 'id'?",
                input: KEYS.ENTER
            },
            {
                message: "User friendly package name?",
                input: "countries" + KEYS.ENTER
            },
            {
                message: "Package short name?",
                input: KEYS.ENTER
            },
            {
                message: "Starting version?",
                input: KEYS.ENTER
            },
            {
                message: "Short package description?",
                input: "somthing short" + KEYS.ENTER
            },
            {
                message: "Website?",
                input: KEYS.ENTER
            },
            {
                message: "Number of sample records?",
                input: KEYS.ENTER
            },
            {
                message: "Publish to registry?",
                input: KEYS.ENTER
            },
            {
                message: "Target registry?",
                input: KEYS.ENTER
            },
            {
                message: "Catalog short name?",
                input: KEYS.ENTER
            },
            {
                message: "Data Access Method?",
                input: "Publish schema and data to registry" + KEYS.ENTER
            },
            {
                message: "Is the above ok?",
                input: "yes" + KEYS.ENTER
            }
        ];

        const exitCode = await testCmd("package", ["file://./tmp-files/countries.csv"], prompts);

        expect(exitCode.code).equal(0);
    });

    it("Should download the data", async function () {
        const prompts = getFetchCommandPromptInputs(["No", "No", "Local", "JSON", "tmp-files"]);
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "fetch",
            [`http://localhost:${registryServerPort}/test-publish-data-batch-A/countries`],
            prompts,
            async (line: string) => {
                if (line.includes("Finished writing 5 records")) {
                    results.messageFound = true;
                }
            }
        );

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found success message").equals(true);

        const content = fs.readFileSync("tmp-files/countries.json").toString();
        const lines = content.split("\n");
        const firstRecord = JSON.parse(lines[0]);
        expect(firstRecord.code).equal("AD");
        expect(firstRecord.name).equal("Andorra");
    });

    it("Should update the source file and republish", async function () {
        fs.copyFileSync(TEST_SOURCE_FILES.FILE20.replace("file://", ""), "tmp-files/countries.csv");

        const prompts = [
            {
                message: "Exclude any attributes?",
                input: KEYS.ENTER
            },
            {
                message: "Rename attributes?",
                input: KEYS.ENTER
            },
            {
                message: "What does each countries record represent?",
                input: KEYS.ENTER
            },
            {
                message: "User friendly package name?",
                input: KEYS.ENTER
            },
            {
                message: "Next version?",
                input: KEYS.ENTER
            },
            {
                message: "Short package description?",
                input: KEYS.ENTER
            },
            {
                message: "Website?",
                input: KEYS.ENTER
            },
            {
                message: "Number of sample records?",
                input: KEYS.ENTER
            },
            {
                message: "Publish to ",
                input: KEYS.ENTER
            }
        ];

        let foundUploadedRecordsMessage = false;
        const exitCode = await testCmd(
            "update",
            [`http://localhost:${registryServerPort}/test-publish-data-batch-A/countries`],
            prompts,
            async (line) => {
                if (line.indexOf("Finished uploading 8 records to") > -1) {
                    foundUploadedRecordsMessage = true;
                }
            }
        );

        expect(exitCode.code).equal(0);

        expect(foundUploadedRecordsMessage).equal(true);
    });

    it("Should download all records", async function () {
        const prompts = getFetchCommandPromptInputs(["No", "No", "Local", "JSON", "tmp-files"]);
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "fetch",
            [`http://localhost:${registryServerPort}/test-publish-data-batch-A/countries`],
            prompts,
            async (line: string) => {
                if (line.includes("Finished writing 8 records")) {
                    results.messageFound = true;
                }
            }
        );

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found success message").equals(true);

        const content = fs.readFileSync("tmp-files/countries.json").toString();
        const lines = content.split("\n");
        expect(lines.length).equals(9);
    });

    it("Should not allow anonymous user to fetch non-public data", async function () {
        removeRegistry(`http://localhost:${registryServerPort}`);

        const prompts = getFetchCommandPromptInputs(["No", "No", "Local", "JSON", "tmp-files"]);
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "fetch",
            [`http://localhost:${registryServerPort}/test-publish-data-batch-A/countries`, "--forceUpdate"],
            prompts,
            async (line: string) => {
                if (line.includes("You are not logged in to the registry")) {
                    results.messageFound = true;
                }
            }
        );

        expect(cmdResult.code, "Exit code").equals(1);
        expect(results.messageFound, "Found success message").equals(true);
    });

    it("Should allow anonymous user to fetch public data", async function () {
        await userAClient.mutate({
            mutation: UpdateCatalogDocument,
            variables: {
                identifier: {
                    catalogSlug: "test-publish-data-batch-A"
                },
                value: {
                    isPublic: true
                }
            }
        });
        await userAClient.mutate({
            mutation: UpdatePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "test-publish-data-batch-A",
                    packageSlug: "countries"
                },
                value: {
                    isPublic: true
                }
            }
        });

        const prompts = getFetchCommandPromptInputs(["No", "No", "Local", "JSON", "tmp-files"]);
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "fetch",
            [`http://localhost:${registryServerPort}/test-publish-data-batch-A/countries`, "--forceUpdate"],
            prompts,
            async (line: string) => {
                if (line.includes("Finished writing 8 records")) {
                    results.messageFound = true;
                }
            }
        );

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found success message").equals(true);

        const content = fs.readFileSync("tmp-files/countries.json").toString();
        const lines = content.split("\n");
        expect(lines.length).equals(9);
    });
});
