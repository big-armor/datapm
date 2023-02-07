import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";
import { expect } from "chai";
import { Properties } from "datapm-lib";
import execa, { ExecaChildProcess } from "execa";
import { addRegistry, resetConfiguration } from "../../src/util/ConfigUtil";
import { registryServerPort } from "./setup";
import {
    createApiKey,
    createTestUser,
    getPromptInputs,
    removePackageFiles,
    testCmd,
    TestResults,
    KEYS,
    defaultPromptInputsForCSVs,
    TEST_SOURCE_FILES,
    loadTestPackageFile
} from "./test-utils";

const generateCommandPrompts = [
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
    "Data Access Method",
    "Is the above ok?"
];

const getGenerateCommandPromptInputs = (inputs?: string[], skip = 0, count = 20) =>
    getPromptInputs(generateCommandPrompts, inputs, skip, count);

describe("Package Command Tests", async () => {
    let apiKey = "";

    before(async () => {
        const userAClient: ApolloClient<NormalizedCacheObject> = await createTestUser();
        apiKey = await createApiKey(userAClient);
        addRegistry({
            url: `http://localhost:${registryServerPort}`,
            apiKey
        });
    });

    after(() => {
        removePackageFiles(["covid-02-01-2020", "package-b"]);

        resetConfiguration();
    });

    it("Can't generate package from invalid URL", async () => {
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd("package", ["invalid"], [], async (line: string) => {
            if (line.includes("No source implementation found to inspect this data")) {
                results.messageFound = true;
            }
        });

        expect(cmdResult.code, "Exit code").equals(1);
        expect(results.messageFound, "Found error message").equals(true);
    });

    it("Can't generate package from non-existing URL", async () => {
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd("package", ["https://test.datapm.xyz"], [], async (line: string) => {
            if (line.includes("ENOTFOUND")) {
                results.messageFound = true;
            }
        });

        expect(cmdResult.code, "Exit code").equals(1);
        expect(results.messageFound, "Found error message").equals(true);
    });

    it("Can't generate package from non-existing package or invalid file format", async () => {
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "package",
            [TEST_SOURCE_FILES.HTTP2],
            [],
            async (line: string, index: number, cmdProcess: ExecaChildProcess) => {
                if (line.includes("Could not automatically detect file type")) {
                    results.messageFound = true;
                    if (cmdProcess.stdin) cmdProcess.stdin.end();
                    cmdProcess.kill("SIGINT");
                }
            }
        );

        expect(cmdResult.signal, "Exit code").equals("SIGINT");
        expect(results.messageFound, "Found error message").equals(true);
    });

    it("Can't generate package with invalid source configuration", async () => {
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "package",
            [TEST_SOURCE_FILES.HTTP1, "--configuration", "invalid"],
            [],
            async (line: string) => {
                if (line.includes("Could not parse the configuration parameter as JSON")) {
                    results.messageFound = true;
                }
            }
        );

        expect(cmdResult.code, "Exit code").equals(1);
        expect(results.messageFound, "Found error message").equals(true);
    });

    it("Can't generate package with invalid package name", async () => {
        const prompts = getGenerateCommandPromptInputs(["", "", "", "", "", "", "===invalid==="]);
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        prompts.splice(6, 0, {
            message: "What does each state-codes record represent?",
            input: `${KEYS.ENTER}`
        });

        const cmdResult = await testCmd(
            "package",
            [TEST_SOURCE_FILES.HTTP1],
            prompts,
            async (line: string, promptIndex: number, cmdProcess: execa.ExecaChildProcess) => {
                // console.log(line);
                if (line.includes("Must start with ")) {
                    results.messageFound = true;
                    cmdProcess.kill("SIGINT");
                }
            }
        );

        expect(cmdResult.code, "Exit code").not.equals(0);
        expect(results.messageFound, "Found error message").equals(true);
    });

    it("Can't generate package with invalid package short name", async () => {
        const prompts = getGenerateCommandPromptInputs(["", "", "", "", "", "", "package-a", "===invalid==="]);
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        prompts.splice(6, 0, {
            message: "What does each state-codes record represent?",
            input: `${KEYS.ENTER}`
        });

        const cmdResult = await testCmd(
            "package",
            [TEST_SOURCE_FILES.HTTP1],
            prompts,
            async (line: string, promptIndex: number, cmdProcess: execa.ExecaChildProcess) => {
                // console.log(line);
                if (line.includes("Must include only letters, numbers, periods, underscores, and hyphens")) {
                    results.messageFound = true;
                    cmdProcess.kill("SIGINT");
                }
            }
        );

        expect(cmdResult.code, "Exit code").not.equals(0);
        expect(results.messageFound, "Found error message").equals(true);
    });

    it("Can't generate package with invalid starting version", async () => {
        const prompts = getGenerateCommandPromptInputs(["", "", "", "", "", "", "package-a", "", "===invalid==="]);
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        prompts.splice(6, 0, {
            message: "What does each state-codes record represent?",
            input: `${KEYS.ENTER}`
        });

        const cmdResult = await testCmd(
            "package",
            [TEST_SOURCE_FILES.HTTP1],
            prompts,
            async (line: string, promptIndex: number, cmdProcess: execa.ExecaChildProcess) => {
                // console.log(line);
                if (line.includes("Must be in format of 1.2.3")) {
                    results.messageFound = true;
                    cmdProcess.kill("SIGINT");
                }
            }
        );

        expect(cmdResult.code, "Exit code").not.equals(0);
        expect(results.messageFound, "Found error message").equals(true);
    });

    it("Can't generate package with invalid description", async () => {
        const prompts = getGenerateCommandPromptInputs(["", "", "", "", "", "", "package-a", "", "", "**"]);
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        prompts.splice(6, 0, {
            message: "What does each state-codes record represent?",
            input: `${KEYS.ENTER}`
        });
        const cmdResult = await testCmd(
            "package",
            [TEST_SOURCE_FILES.HTTP1],
            prompts,
            async (line: string, promptIndex: number, cmdProcess: execa.ExecaChildProcess) => {
                // console.log(line);
                if (line.includes("Must be longer than 3 characters")) {
                    results.messageFound = true;
                    cmdProcess.kill("SIGINT");
                }
            }
        );

        expect(cmdResult.code, "Exit code").not.equals(0);
        expect(results.messageFound, "Found error message").equals(true);
    });

    it("Binary boolean type should be merged into number type", async () => {
        const results: TestResults = {
            exitCode: -1,
            messageFound: false,
            senateClassStatsFound: false
        };

        const cmdResult = await testCmd(
            "package",
            [TEST_SOURCE_FILES.FILE5, "--defaults"],
            defaultPromptInputsForCSVs,
            async (line: string) => {
                if (line.includes("senate_class") && line.includes("integer(18.59%), null(81.41%)")) {
                    results.senateClassStatsFound = true;
                }
                if (line.includes("When you are ready, you can publish with the following command")) {
                    results.messageFound = true;
                }
            }
        );
        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found success message").equals(true);
        expect(results.senateClassStatsFound).equals(true);

        const packageFile = loadTestPackageFile("legislators");
        const schema = packageFile.schemas[0];
        const properties = schema.properties;
        // eslint-disable-next-line camelcase
        const senateClassProperty = properties?.senate_class;
        const valueTypes = Object.keys(senateClassProperty.types);
        const sampleRecords = schema.sampleRecords;
        // eslint-disable-next-line camelcase
        const senateClassValues = sampleRecords?.map((record) => record.senate_class);

        expect(valueTypes.length).equals(2);
        expect(valueTypes).includes("integer");
        expect(valueTypes).includes("null");

        expect(
            senateClassValues?.every((value) => value === undefined || value === null || typeof value === "number")
        ).equals(true);

        removePackageFiles(["legislators"]);
    });

    it("Record and column units should be set", async () => {
        const prompts = getGenerateCommandPromptInputs([
            "",
            "",
            "",
            "",
            "",
            "",
            "package-a",
            "",
            "",
            "Package A",
            "https://test.datapm-not-a-site.io",
            "10",
            "no"
        ]);
        prompts.splice(
            6,
            0,
            {
                message: "What does each covid-02-01-2020 record represent?",
                input: `unit${KEYS.ENTER}`
            },
            {
                message: "Do you want to specify units for the 3 number properties?",
                input: "Y" + KEYS.ENTER
            },
            {
                message: "Unit for attribute 'Confirmed'?",
                input: `confirmed${KEYS.ENTER}`
            },
            {
                message: "Unit for attribute 'Deaths'?",
                input: `deaths${KEYS.ENTER}`
            },
            {
                message: "Unit for attribute 'Recovered'?",
                input: `recovered${KEYS.ENTER}`
            }
        );
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };
        const cmdResult = await testCmd("package", [TEST_SOURCE_FILES.FILE1], prompts, async (line: string) => {
            if (line.includes("When you are ready, you can publish with the following command")) {
                results.messageFound = true;
            }
        });
        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found success message").equals(true);

        const packageFile = loadTestPackageFile("package-a");
        expect(packageFile.schemas[0].unit).equals("unit");
        const properties = packageFile.schemas[0].properties as Properties;
        expect(properties.Confirmed.unit).equals("confirmed");
        expect(properties.Deaths.unit).equals("deaths");
        expect(properties.Recovered.unit).equals("recovered");
        removePackageFiles(["package-a"]);
    });

    it("Should confirm if there are more than 10 number type properties", async function () {
        const prompts = getGenerateCommandPromptInputs([
            "",
            "",
            "",
            "",
            "",
            "",
            "package-a",
            "",
            "",
            "Package A",
            "https://test.datapm-not-a-site.io",
            "10",
            "no"
        ]);
        prompts.splice(
            6,
            0,
            {
                message: "What does each us-covid record represent?",
                input: `unit${KEYS.ENTER}`
            },
            {
                message: "Do you want to specify units for the 10 number properties?",
                input: `n${KEYS.ENTER}`
            }
        );
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };
        const cmdResult = await testCmd("package", [TEST_SOURCE_FILES.FILE6], prompts, async (line: string) => {
            if (line.includes("When you are ready, you can publish with the following command")) {
                results.messageFound = true;
            }
        });
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
            "Publish to registry?"
        ];
        const promptInputs = getPromptInputs(generateCommandPrompts, [
            "yes",
            "0",
            "",
            "Y", // exclude attrbiutes
            `${KEYS.DOWN}${KEYS.DOWN} `, // attrbiutes to exclude
            "Y", // rename attributes
            `${KEYS.DOWN} `, // attributes to rename
            "New State Name", // new attribute name
            "", // derived from other data
            "", // what does each record represent
            "package-b", // package name
            "", // package short name
            "", // starting version
            "some short description", // short package description
            "", // website
            "", // number of sample records
            "no" // publish to registry
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
        const packageFile = loadTestPackageFile("package-b");
        const properties = packageFile.schemas[0].properties as Properties;
        const property = properties["State Name"];

        expect(properties["State Code"].hidden).equal(true);
        expect(properties["State Name"].title).equals("New State Name");
        expect(Object.keys(properties).length).equals(2);
        expect(Object.keys(properties)).include.members(["State Name"]);
        expect(property.title).equals("New State Name");
    });

    describe("HTTP source", () => {
        it("Should show publish command help text when failed to publish", async () => {
            resetConfiguration();
            const prompts = getGenerateCommandPromptInputs([
                "",
                "",
                "",
                "",
                "",
                "",
                "package-a",
                "",
                "",
                "Package A",
                "",
                "10", // number of sample records
                "yes" // publish to registry
            ]);
            prompts.splice(6, 0, {
                message: "What does each state-codes record represent?",
                input: KEYS.ENTER
            });
            const results: TestResults = {
                exitCode: -1,
                errorMessageFound: false,
                helperMessageFound: false
            };
            const cmdResult = await testCmd("package", [TEST_SOURCE_FILES.HTTP1], prompts, async (line: string) => {
                if (line.includes("You have not logged into a registry from the command line")) {
                    results.errorMessageFound = true;
                }
            });
            expect(cmdResult.code, "Exit code").equals(1);
            expect(results.errorMessageFound, "Found attempt message").equals(true);
            removePackageFiles(["package-a"]);
            addRegistry({
                url: `http://localhost:${registryServerPort}`,
                apiKey
            });
        });

        it("Generate package A without publish", async () => {
            const prompts = getGenerateCommandPromptInputs([
                "",
                "",
                "",
                "",
                "",
                "",
                "package-a",
                "",
                "",
                "Package A",
                "https://test.datapm-not-a-site.io",
                "10",
                "no"
            ]);
            prompts.splice(6, 0, {
                message: "What does each state-codes record represent?",
                input: KEYS.ENTER
            });
            const results: TestResults = {
                exitCode: -1,
                messageFound: false
            };
            const cmdResult = await testCmd("package", [TEST_SOURCE_FILES.HTTP1], prompts, async (line: string) => {
                if (line.includes("When you are ready, you can publish with the following command")) {
                    results.messageFound = true;
                }
            });
            const packageFile = loadTestPackageFile("package-a");
            expect(cmdResult.code, "Exit code").equals(0);
            expect(results.messageFound, "Found success message").equals(true);
            expect(packageFile.website).equals("https://test.datapm-not-a-site.io");
            expect(packageFile.schemas[0].sampleRecords?.length).equals(10);
            removePackageFiles(["package-a"]);
        });

        it("Generate package A with defaults option", async () => {
            const results: TestResults = {
                exitCode: -1,
                messageFound: false
            };
            const cmdResult = await testCmd(
                "package",
                [TEST_SOURCE_FILES.HTTP1, "--defaults"],
                defaultPromptInputsForCSVs,
                async (line: string) => {
                    if (line.includes("When you are ready, you can publish with the following command")) {
                        results.messageFound = true;
                    }
                }
            );
            expect(cmdResult.code, "Exit code").equals(0);
            expect(results.messageFound, "Found success message").equals(true);
            removePackageFiles(["state-codes"]);
        });

        it("Generate & publish package A", async () => {
            const prompts = getGenerateCommandPromptInputs([
                "",
                "",
                "",
                "",
                "",
                "",
                "package-a",
                "",
                "",
                "Package A",
                "https://test.datapm-not-a-site.io",
                "10",
                "yes", // publish to registry
                "", // target registry
                "", // catalog name
                "", // publish method
                "" // is it ok
            ]);
            prompts.splice(6, 0, {
                message: "What does each state-codes record represent?",
                input: KEYS.ENTER
            });
            const results: TestResults = {
                exitCode: -1,
                messageFound: false
            };
            const cmdResult = await testCmd("package", [TEST_SOURCE_FILES.HTTP1], prompts, async (line: string) => {
                if (line.includes("Share the command below to fetch the data in this package")) {
                    results.messageFound = true;
                }
            });
            expect(cmdResult.code, "Exit code").equals(0);
            expect(results.messageFound, "Found success message").equals(true);
            removePackageFiles(["package-a"]);
        });
    });
});
