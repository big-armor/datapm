import {
    createApiKey,
    createTestPackage,
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

describe("CSV Source Tests", function () {
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
        removePackageFiles(["airports-small", "sea-levels", "coinbaseusd-small", "business-confidence-index"]);
    });

    it("Should read CSVs with quotes", async () => {
        const packageFilePath = await createTestPackage(
            TEST_SOURCE_FILES.FILE9,
            true,
            "airports-small",
            "Small selection of airports",
            "",
            [
                {
                    message: "What does each airports-small record represent?",
                    input: "airport\n"
                },
                {
                    message: "Unit for attribute 'id'?",
                    input: KEYS.ENTER
                },
                {
                    message: "Unit for attribute 'latitude_deg'?",
                    input: "degrees" + KEYS.ENTER
                },
                {
                    message: "Unit for attribute 'longitude_deg'?",
                    input: "degrees" + KEYS.ENTER
                },
                {
                    message: "Unit for attribute 'elevation_ft'?",
                    input: "feet" + KEYS.ENTER
                }
            ]
        );

        const packageFile = loadTestPackageFile(packageFilePath);

        expect(packageFile.displayName).equal("airports-small");
        expect(packageFile.schemas[0].recordCount).equal(99);
    });

    const generatePackageCommandPrompts = [
        "Is there a header line above?",
        "Header row line number?",
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

    it("Should read CSVs with offset headers", async () => {
        const unitPrompts = [
            {
                message: "What does each sea-level_fig-1 record represent?",
                input: "year\n"
            },
            {
                message: "Do you want to specify units",
                input: "n" + KEYS.ENTER
            }
        ];

        const prompts = getPromptInputs(generatePackageCommandPrompts, [
            "",
            "7",
            "",
            "",
            "",
            "",
            "sea-levels",
            "",
            "",
            "Some stuff",
            "https://test.datapm-not-a-site.io",
            "10",
            KEYS.DOWN
        ]);

        prompts.splice(6, 0, ...unitPrompts);

        const exitCode = await testCmd("package", [TEST_SOURCE_FILES.FILE10], prompts);

        expect(exitCode.code).equal(0);

        const packageFile = loadTestPackageFile("sea-levels");

        expect(packageFile.displayName).equal("sea-levels");
        expect(packageFile.schemas[0].recordCount).equal(135);
    });

    it("Should read CSVs with without headers", async () => {
        const unitPrompts = [
            {
                message: "What does each coinbaseUSD-small record represent?",
                input: "transaction\n"
            },
            {
                message: "Do you want to specify units",
                input: "y" + KEYS.ENTER
            },
            {
                message: "Unit for attribute 'Column0'?",
                input: "milliseconds" + KEYS.ENTER
            },
            {
                message: "Unit for attribute 'Column1'?",
                input: "USD" + KEYS.ENTER
            },
            {
                message: "Unit for attribute 'Column2'?",
                input: "BTC" + KEYS.ENTER
            }
        ];

        const prompts = getPromptInputs(
            generatePackageCommandPrompts.filter((e, index) => index !== 1),
            [
                KEYS.DOWN,
                "",
                "",
                "",
                "",
                "coinbaseUSD-small",
                "",
                "",
                "Some stuff",
                "https://test.datapm-not-a-site.io",
                "10",
                KEYS.DOWN
            ]
        );

        prompts.splice(5, 0, ...unitPrompts);

        const exitCode = await testCmd("package", [TEST_SOURCE_FILES.FILE11], prompts);

        expect(exitCode.code).equal(0);

        const packageFile = loadTestPackageFile("coinbaseusd-small");

        expect(packageFile.displayName).equal("coinbaseUSD-small");
        expect(packageFile.schemas[0].recordCount).equal(100);
    });

    it("Should read UTF-8 encoded CVS with BOM headers", async () => {
        const packageFilePath = await createTestPackage(TEST_SOURCE_FILES.FILE14, true, "business-confidence-index");

        const packageFile = loadTestPackageFile(packageFilePath);

        expect(packageFile.displayName).equal("business-confidence-index");
        expect(packageFile.schemas[0].recordCount).equal(99);
    });
});
