import { removePackageFiles, TEST_SOURCE_FILES, testCmd, getPromptInputs, loadTestPackageFile } from "./test-utils";
import { expect } from "chai";

describe("TAR File Tests", function () {
    after(() => {
        removePackageFiles(["source"]);
    });

    it("Should generate a package from TAR file with multiple CSVs", async () => {
        const generatePackageCommandPrompts = [
            "Filename Regex?",
            "Is there a header line above?",
            "Header row line number?"
        ];

        const prompts = getPromptInputs(generatePackageCommandPrompts, ["leg-.*\\.csv", "", "0"]);

        const exitCode = await testCmd("package", ["--defaults", TEST_SOURCE_FILES.FILE25], prompts);
        expect(exitCode.code).equal(0);

        const packageFile = loadTestPackageFile("source");

        expect(packageFile.displayName).equal("source");
        expect(packageFile.schemas[0].recordCount).equal(399);
    });

    it("Should generate a package from TAR file with a single JSON", async () => {
        const generatePackageCommandPrompts = ["Filename Regex?", "JSONPath for data?"];

        const prompts = getPromptInputs(generatePackageCommandPrompts, ["daily_prices.json", ".*"]);

        const exitCode = await testCmd("package", ["--defaults", TEST_SOURCE_FILES.FILE25], prompts);
        expect(exitCode.code).equal(0);

        const packageFile = loadTestPackageFile("source");

        expect(packageFile.displayName).equal("source");
        expect(packageFile.schemas[0].recordCount).equal(5953);
    });
});
