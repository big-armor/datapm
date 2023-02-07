import { expect } from "chai";
import fs from "fs";
import { createTestPackage, removePackageFiles, testCmd, TestResults, TEST_SOURCE_FILES } from "./test-utils";

describe("Standard Out Sink", function () {
    let packageAFilePath: string;

    before(async function () {
        packageAFilePath = await createTestPackage(TEST_SOURCE_FILES.HTTP1, true);
        expect(packageAFilePath).to.not.equal(null);
        expect(packageAFilePath).to.not.equal("");
    });

    beforeEach(async function () {
        if (fs.existsSync("local_state-codes_v1.datapm.state.json"))
            fs.unlinkSync("local_state-codes_v1.datapm.state.json");
    });

    after(async function () {
        fs.unlinkSync("local_state-codes_v1.datapm.state.json");
        removePackageFiles(["state-codes"]);
    });

    it("Should print to standard out", async function () {
        const results: TestResults = {
            exitCode: -1,
            oneLineFound: false,
            nonJSONLineFound: false
        };

        const cmdResult = await testCmd(
            "fetch",
            [packageAFilePath, "--quiet", "--sinkType", "stdout"],
            [],
            async (line: string) => {
                results.oneLineFound = true;
                if (
                    !line.startsWith("{") &&
                    !line.startsWith("Debugger attached.") &&
                    !line.startsWith("Waiting for the debugger")
                ) {
                    console.log(line);
                    results.nonJSONLineFound = true;
                }
            }
        );

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.oneLineFound, "Should print a line").equals(true);
        expect(results.nonJSONLineFound, "Only json content").equals(false);
    });

    it("Should print warning message if quiet flag was not added", async function () {
        const results: TestResults = {
            exitCode: -1,
            warningMessageFound: false
        };

        const cmdResult = await testCmd(
            "fetch",
            [packageAFilePath, "--defaults", "--sinkType", "stdout"],
            [],
            async (line: string) => {
                if (line.includes("You should probably use the --quiet flag to disable all non-data output")) {
                    results.warningMessageFound = true;
                }
            }
        );

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.warningMessageFound, "Should print warning message").equals(true);
    });
});
