import { expect } from "chai";
import { addRegistry, resetConfiguration } from "../../src/util/ConfigUtil";
import { registryServerPort } from "./setup";
import {
    createApiKey,
    createTestPackage,
    createTestUser,
    removePackageFiles,
    testCmd,
    TestResults,
    KEYS,
    TEST_SOURCE_FILES
} from "./test-utils";

describe("Compare Command Tests", async function () {
    let packageAFilePath = "";
    let packageBFilePath = "";

    before(async () => {
        const userAClient = await createTestUser();
        const apiKey = await createApiKey(userAClient);
        addRegistry({
            url: `http://localhost:${registryServerPort}`,
            apiKey
        });

        try {
            packageAFilePath = await createTestPackage(
                TEST_SOURCE_FILES.FILE1,
                false,
                "package-a",
                "Package A",
                JSON.stringify({ quote: '"' }),
                [
                    {
                        message: "What does each covid-02-01-2020 record represent?",
                        input: KEYS.ENTER
                    },
                    {
                        message: "Do you want to specify units for the",
                        input: "Y" + KEYS.ENTER
                    },
                    {
                        message: "Unit for attribute 'Confirmed'?",
                        input: KEYS.ENTER
                    },
                    {
                        message: "Unit for attribute 'Deaths'?",
                        input: KEYS.ENTER
                    },
                    {
                        message: "Unit for attribute 'Recovered'?",
                        input: KEYS.ENTER
                    }
                ]
            );

            packageBFilePath = await createTestPackage(
                TEST_SOURCE_FILES.FILE2,
                false,
                "package-b",
                "Package B",
                JSON.stringify({ quote: '"' }),
                [
                    {
                        message: "What does each covid-03-01-2020 record represent?",
                        input: KEYS.ENTER
                    },
                    {
                        message: "Do you want to specify units for the",
                        input: "Y" + KEYS.ENTER
                    },
                    {
                        message: "Unit for attribute 'Confirmed'?",
                        input: KEYS.ENTER
                    },
                    {
                        message: "Unit for attribute 'Deaths'?",
                        input: KEYS.ENTER
                    },
                    {
                        message: "Unit for attribute 'Recovered'?",
                        input: KEYS.ENTER
                    },
                    {
                        message: "Unit for attribute 'Latitude'?",
                        input: KEYS.ENTER
                    },
                    {
                        message: "Unit for attribute 'Longitude'?",
                        input: KEYS.ENTER
                    }
                ]
            );
        } catch (error) {
            console.log(JSON.stringify(error));
            throw error;
        }
    });

    after(() => {
        removePackageFiles(["package-a", "package-b"]);
        removePackageFiles(["covid-02-01-2020"]);

        resetConfiguration();
    });

    it("Compare invalid packages", async function () {
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd("compare", ["invalid", packageAFilePath], [], async (line: string) => {
            if (
                line.includes(
                    "either not a valid package identifier, a valid package url, or url pointing to a valid package file."
                )
            ) {
                results.messageFound = true;
            }
        });

        expect(cmdResult.code, "Exit code").equals(1);
        expect(results.messageFound, "Found error message").equals(true);
    });

    it("Compare non-existing packages", async function () {
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "compare",
            ["https://test.datapm.xyz", packageAFilePath],
            [],
            async (line: string) => {
                if (line.includes("ENOTFOUND")) {
                    results.messageFound = true;
                }
            }
        );

        expect(cmdResult.code, "Exit code").equals(1);
        expect(results.messageFound, "Found error message").equals(true);
    });

    it("Compare invalid package URL", async function () {
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "compare",
            ["https://google.com", packageAFilePath],
            [],
            async (line: string) => {
                if (line.includes("NOT_A_PACKAGE_FILE")) {
                    results.messageFound = true;
                }
            }
        );

        expect(cmdResult.code, "Exit code").equals(1);
        expect(results.messageFound, "Found error message").equals(true);
    });

    it("Compare same packages", async function () {
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd("compare", [packageAFilePath, packageAFilePath], [], async (line: string) => {
            if (line.includes("No differences found")) {
                results.messageFound = true;
            }
        });

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found success message").equals(true);
    });

    it("Compare different packages", async function () {
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd("compare", [packageAFilePath, packageBFilePath], [], async (line: string) => {
            if (line.includes("Found 7 differences")) {
                results.messageFound = true;
            }
        });

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found success message").equals(true);
    });

    // TODO add test for comparing modified (non-canonical) packages
});
