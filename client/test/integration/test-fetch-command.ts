import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";
import { expect } from "chai";
import fs from "fs";
import { addRegistry, resetConfiguration } from "../../src/util/ConfigUtil";
import { registryServerPort } from "./setup";
import {
    createApiKey,
    createTestPackage,
    createTestUser,
    getPromptInputs,
    removePackageFiles,
    testCmd,
    TestResults,
    KEYS,
    TEST_SOURCE_FILES
} from "./test-utils";

const fetchCommandPrompts = [
    "Exclude any attributes from",
    "Rename attributes from",
    "Sink Connector?",
    "File format?",
    "File Location?"
];

const getFetchCommandPromptInputs = (inputs?: string[], skip = 0) => getPromptInputs(fetchCommandPrompts, inputs, skip);

describe("Fetch Command Tests", async function () {
    let packageAFilePath = "";

    before(async () => {
        resetConfiguration();

        const userAClient: ApolloClient<NormalizedCacheObject> = await createTestUser();
        const apiKey = await createApiKey(userAClient);
        addRegistry({
            url: `http://localhost:${registryServerPort}`,
            apiKey
        });

        packageAFilePath = await createTestPackage(
            TEST_SOURCE_FILES.HTTP1,
            false,
            "package-a",
            "Package A",
            JSON.stringify({ quote: '"' }),
            [
                {
                    message: "What does each state-codes record represent?",
                    input: KEYS.ENTER
                }
            ]
        );

        expect(packageAFilePath != null, "packageAFilePath not null").equal(true);
    });

    after(() => {
        removePackageFiles(["package-a", "package-b"]);

        if (fs.existsSync("tmp-files")) fs.rmSync("tmp-files", { recursive: true });
        resetConfiguration();
    });

    it("Can't fetch package from invalid package identifier", async function () {
        const prompts = undefined;
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd("fetch", ["invalid"], prompts, async (line: string) => {
            if (line.includes("Could not find package or source by the reference")) {
                results.messageFound = true;
            }
        });

        expect(cmdResult.code, "Exit code").equals(1);
        expect(results.messageFound, "Found error message").equals(true);
    });

    it("Can't fetch package from invalid local file", async function () {
        const invalidPackageFileName = "invalid-package-file.json";
        fs.writeFileSync(invalidPackageFileName, "{}");

        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd("fetch", [invalidPackageFileName, "--defaults"], [], async (line: string) => {
            if (line.includes("INVALID_PACKAGE_FILE_SCHEMA")) {
                results.messageFound = true;
            }
        });

        expect(cmdResult.code, "Exit code").equals(1);
        expect(results.messageFound, "Found error message").equals(true);

        fs.unlinkSync(invalidPackageFileName);
    });

    it("Can't fetch package from non-existing URL", async function () {
        const prompts = undefined;
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd("fetch", ["https://test.datapm.xyz"], prompts, async (line: string) => {
            if (line.includes("ENOTFOUND")) {
                results.messageFound = true;
            }
        });

        expect(cmdResult.code, "Exit code").equals(1);
        expect(results.messageFound, "Found error message").equals(true);
    });

    it("Can't fetch package from non-existing catalog", async function () {
        const prompts = undefined;
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "fetch",
            [`http://localhost:${registryServerPort}/some-invalid-catalog/test-data`],
            prompts,
            async (line: string) => {
                if (line.includes("The catalog was not found")) {
                    results.messageFound = true;
                }
            }
        );

        expect(cmdResult.code, "Exit code").equals(1);
        expect(results.messageFound, "Found error message").equals(true);
    });

    it("Can't fetch package with invalid sink configuration", async function () {
        const prompts = getFetchCommandPromptInputs(["No", "No"]);
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "fetch",
            [packageAFilePath, "--sinkConfig", "invalid"],
            prompts,
            async (line: string) => {
                if (line.includes("ERROR_PARSING_SINK_CONFIG")) {
                    results.messageFound = true;
                }
            }
        );

        expect(cmdResult.code, "Exit code").equals(1);
        expect(results.messageFound, "Found error message").equals(true);
    });

    it("Fetch package with defaults option", async function () {
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "fetch",
            [packageAFilePath, "--defaults", "--forceUpdate"],
            [],
            async (line: string) => {
                if (line.includes("Finished writing 51 records")) {
                    results.messageFound = true;
                }
            }
        );

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found success message").equals(true);
    });

    it("Fetch package with file sink", async function () {
        const prompts = getFetchCommandPromptInputs(["No", "No", "Local", "JSON"]);
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "fetch",
            [packageAFilePath],
            prompts,
            async (line: string, promptIndex: number) => {
                if (
                    promptIndex === prompts.length &&
                    line.includes("Next time you can run this same configuration in a single command.")
                ) {
                    results.messageFound = true;
                }

                if (line.includes("--sinkConfig")) {
                    results.defaultsFound = true;
                }
            }
        );

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found success message").equals(true);
    });

    it("Generate package with excluding and renaming attributes", async function () {
        const generateCommandPrompts = [
            "Is there a header line above?",
            "Header row line number?",
            "How are files updated?",
            "Exclude any attributes",
            "Attributes to exclude?",
            "Rename attributes",
            "Attributes to rename?",
            `New attribute name for "State Name"?`,
            "derived from other 'upstream data'?",
            "What does each state-codes record represent?",
            "User friendly package name?",
            "Package short name?",
            "Starting version?",
            "Short package description?",
            "Website?",
            "Number of sample records?",
            "Publish to registry?",
            "Target registry?",
            "Catalog short name?",
            "Data Access Method",
            "Is the above ok?"
        ];
        const promptInputs = getPromptInputs(generateCommandPrompts, [
            "",
            "0",
            "",
            "Y",
            `${KEYS.DOWN}${KEYS.DOWN} `,
            "Y",
            `${KEYS.DOWN} `,
            "New State Name",
            "",
            "",
            "package-b",
            "",
            "",
            "Package B",
            "",
            "",
            "No" // publish to registry
        ]);
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd("package", [TEST_SOURCE_FILES.HTTP1], promptInputs, async (line: string) => {
            if (line.includes("When you are ready, you can publish with the following command")) {
                results.messageFound = true;
            }
        });

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found success message").equals(true);
    });

    it("Should honor the excluded and renamed attributes", async function () {
        const prompts = getFetchCommandPromptInputs(["No", "No", "Local", "JSON", "tmp-files"]);
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "fetch",
            ["local/package-b", "--forceUpdate"],
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
        expect(firstRecord["State Code"]).not.exist;
        // eslint-disable-next-line no-unused-expressions
        expect(firstRecord["New State Name"]).exist;
    });

    // TODO set package and catalog public, then fetch with an anonymous client that doesn't have a registry config
});
