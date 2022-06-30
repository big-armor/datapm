import {
    createApiKey,
    createTestPackage,
    createTestUser,
    removePackageFiles,
    KEYS,
    getPromptInputs,
    testCmd,
    loadTestPackageFile
} from "./test-utils";
import { addRegistry, resetConfiguration } from "../../src/util/ConfigUtil";
import { registryServerPort } from "./setup";
import { expect } from "chai";

describe("Multiple CSV Tests", function () {
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
        removePackageFiles(["non-profits"]);
    });

    it("Should read multiple CSV files", async () => {
        const packageFilePath = await createTestPackage(
            ["file://./test/sources/non-profits-*.csv"],
            true,
            "non profits",
            "US based non profits",
            "",
            [
                {
                    message: "What does each airports-small record represent?",
                    input: "airport\n"
                },
                {
                    message: "Do you want to specify ",
                    input: KEYS.ENTER
                }
            ]
        );

        const packageFile = loadTestPackageFile(packageFilePath);

        expect(packageFile.displayName).equal("non-profits");
        expect(packageFile.schemas[0].recordCount).equal(396);
    });

    it("Should read multiple zip files with csvs", async () => {
        removePackageFiles(["non-profits"]);

        const generatePackageCommandPrompts = ["Filename Regex?", "Is there a header line above?"];

        const prompts = getPromptInputs(generatePackageCommandPrompts, ["\\.csv", "yes"]);

        const exitCode = await testCmd(
            "package",
            ["--defaults", "file://./test/sources/non-profits-1.zip", "file://./test/sources/non-profits-2-4.zip"],
            prompts
        );
        expect(exitCode.code).equal(0);

        const packageFile = loadTestPackageFile("non-profits");

        expect(packageFile.displayName).equal("non-profits");
        expect(packageFile.schemas[0].recordCount).equal(396);
    });
});
