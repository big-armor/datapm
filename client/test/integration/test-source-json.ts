import {
    createApiKey,
    createTestUser,
    KEYS,
    removePackageFiles,
    TEST_SOURCE_FILES,
    testCmd,
    getPromptInputs,
    loadTestPackageFile
} from "./test-utils";
import { expect } from "chai";
import { addRegistry, resetConfiguration } from "../../src/util/ConfigUtil";
import { registryServerPort } from "./setup";

describe("JSON Tests", function () {
    before(async () => {
        resetConfiguration();
        const userAClient = await createTestUser();
        const apiKey = await createApiKey(userAClient);
        addRegistry({
            url: `http://localhost:${registryServerPort}`,
            apiKey
        });
    });

    after(() => {
        removePackageFiles(["daily-prices"]);
    });

    const generatePackageCommandPrompts = [
        "JSONPath for data?",
        "How are files updated?",
        "Exclude any attributes",
        "Rename attributes",
        "derived from other 'upstream data'?",
        "User friendly package name?",
        "Package short name?",
        "Starting version?",
        "Short package description?",
        "Website?",
        "Number of sample records?",
        "Publish to registry?",
        "Target registry?",
        "Catalog short name?",
        "Data Access Method?",
        "Is the above ok?"
    ];

    it("Should read JSON", async () => {
        const unitPrompts = [
            {
                message: "What does each daily_prices record represent?",
                input: "day\n"
            },
            {
                message: "Unit for attribute 'Price'?",
                input: "dollar\n"
            }
        ];

        const prompts = getPromptInputs(generatePackageCommandPrompts, [
            "*",
            "",
            "",
            "",

            "",

            "daily-prices",
            "",
            "",
            "Some stuff",
            "https://test.datapm-not-a-site.io",
            "10",
            KEYS.DOWN
        ]);

        prompts.splice(5, 0, ...unitPrompts);

        const exitCode = await testCmd("package", [TEST_SOURCE_FILES.FILE13], prompts);
        expect(exitCode.code).equal(0);

        const packageFile = loadTestPackageFile("daily-prices");

        expect(packageFile.displayName).equal("daily-prices");
        expect(packageFile.schemas[0].recordCount).equal(5953);
    });
});
