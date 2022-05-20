import { expect } from "chai";
import { resetConfiguration } from "../../src/util/ConfigUtil";
import { createTestPackage, removePackageFiles, testCmd, TestResults, KEYS, TEST_SOURCE_FILES } from "./test-utils";

describe("Info Command Tests", async function () {
    let packageAFilePath = "";

    before(async () => {
        packageAFilePath = await createTestPackage(TEST_SOURCE_FILES.HTTP1, false, "package-a", "Package A", "", [
            {
                message: "What does each state-codes record represent?",
                input: KEYS.ENTER
            }
        ]);
    });

    after(() => {
        removePackageFiles(["package-a"]);
        resetConfiguration();
    });

    it("Can't fetch private package info without adding Api Key", async function () {
        resetConfiguration();

        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd("info", [packageAFilePath], [], async (line: string) => {
            if (line.includes("NOT_AUTHENTICATED")) {
                results.messageFound = true;
            }
        });

        expect(cmdResult.code, "Exit code").equals(1);
        expect(results.messageFound, "Found error message").equals(true);
    });

    it("Fetch package info", async function () {
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd("info", [packageAFilePath], [], async (line: string) => {
            if (line.includes("Package: package-a")) {
                results.messageFound = true;
            }
        });

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found success message").equals(true);
    });
});
