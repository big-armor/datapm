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

describe("XML Tests", function () {
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
        removePackageFiles(["country-currencies"]);
    });

    const generatePackageCommandPrompts = [
        "XPath for data nodes?",
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

    it("Should read XML", async () => {
        const unitPrompts = [
            {
                message: "What does each country-currencies record represent?",
                input: "country\n"
            },
            {
                message: "Unit for attribute 'CcyNbr'?",
                input: "\n"
            },
            {
                message: "Unit for attribute 'CcyMnrUnts'?",
                input: "\n"
            }
        ];

        const prompts = getPromptInputs(generatePackageCommandPrompts, [
            "/ISO_4217/CcyTbl/CcyNtry",
            "",
            "",
            "",
            "",
            "country-currencies",
            "",
            "",
            "Some stuff",
            "https://test.datapm-not-a-site.io",
            "10",
            KEYS.DOWN,
            KEYS.DOWN,
            ""
        ]);

        prompts.splice(5, 0, ...unitPrompts);

        const exitCode = await testCmd("package", [TEST_SOURCE_FILES.FILE12], prompts);
        expect(exitCode.code).equal(0);

        const packageFile = loadTestPackageFile("country-currencies");

        expect(packageFile.displayName).equal("country-currencies");
        expect(packageFile.schemas[0].recordCount).equal(279);
    });
});
