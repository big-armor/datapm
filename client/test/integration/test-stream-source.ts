import { expect } from "chai";
import { loadPackageFileFromDisk, Properties, Schema } from "datapm-lib";
import execa from "execa";
import { resetConfiguration } from "../../src/util/ConfigUtil";
import { getPromptInputs, removePackageFiles, testCmd, TestResults, KEYS } from "./test-utils";

const generateCommandPrompts = [
    "Exclude any attributes",
    "Rename attributes",
    "derived from other 'upstream data'?",

    "User friendly package name?",
    "Package short name?",
    "Starting version?",
    "Short package description?",
    "Website?",
    "Number of sample records?",
    "Publish to registry?"
];

const getGenerateCommandPromptInputs = (inputs?: string[], skip = 0, count = 20) =>
    getPromptInputs(generateCommandPrompts, inputs, skip, count);

describe("Test Stream Source Test", function () {
    before(async function () {
        resetConfiguration();
    });

    after(async function () {
        removePackageFiles(["test"]);
    });

    it("Record count should be greater than 1", async function () {
        const prompts = [
            {
                message: "How many test records?",
                input: KEYS.ENTER
            }
        ];

        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "package",
            ["test://"],
            prompts,
            (line: string, promptIndex: number, cmdProcess: execa.ExecaChildProcess) => {
                if (promptIndex === 1 && line.includes("Record count should be greater than 1")) {
                    results.messageFound = true;
                    cmdProcess.kill("SIGINT");
                }
            }
        );

        expect(cmdResult.signal, "Exit code").equals("SIGINT");
        expect(results.messageFound, "Found error message").equals(true);
    });

    it("There should be at least 1 attribute", async function () {
        const prompts = [
            {
                message: "How many test records?",
                input: `10${KEYS.ENTER}`
            },
            {
                message: "Name of attribute?",
                input: KEYS.ENTER
            }
        ];

        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "package",
            ["test://"],
            prompts,
            (line: string, promptIndex: number, cmdProcess: execa.ExecaChildProcess) => {
                if (promptIndex === 2 && line.includes("There should be at least 1 attribute")) {
                    results.messageFound = true;
                    cmdProcess.kill("SIGINT");
                }
            }
        );

        expect(cmdResult.signal, "Exit code").equals("SIGINT");
        expect(results.messageFound, "Found error message").equals(true);
    });

    it("There shouldn't be any duplicated attributes", async function () {
        const prompts = [
            {
                message: "How many test records?",
                input: `10${KEYS.ENTER}`
            },
            {
                message: "Name of attribute?",
                input: `Zip Code${KEYS.ENTER}`
            },
            {
                message: "Category of 'Zip Code' attribute?",
                input: KEYS.ENTER
            },
            {
                message: "Type of 'Zip Code' attribute?",
                input: KEYS.ENTER
            },
            {
                message: "Name of attribute?",
                input: `Zip Code${KEYS.ENTER}`
            }
        ];

        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "package",
            ["test://"],
            prompts,
            (line: string, promptIndex: number, cmdProcess: execa.ExecaChildProcess) => {
                if (promptIndex === 5 && line.includes("'Zip Code' attribute is already existing")) {
                    results.messageFound = true;
                    cmdProcess.kill("SIGINT");
                }
            }
        );

        expect(cmdResult.signal, "Exit code").equals("SIGINT");
        expect(results.messageFound, "Found error message").equals(true);
    });

    it("Should generate package from test stream source without issue", async function () {
        const prompts = [
            {
                message: "How many test records?",
                input: `10${KEYS.ENTER}`
            },
            {
                message: "Name of attribute?",
                input: `Company${KEYS.ENTER}`
            },
            {
                message: "Category of 'Company' attribute?",
                input: `${Array(2).fill(KEYS.DOWN).join("")}${KEYS.ENTER}`
            },
            {
                message: "Type of 'Company' attribute?",
                input: KEYS.ENTER
            },
            {
                message: "Name of attribute?",
                input: `IBAN${KEYS.ENTER}`
            },
            {
                message: "Category of 'IBAN' attribute?",
                input: `${Array(5).fill(KEYS.DOWN).join("")}${KEYS.ENTER}`
            },
            {
                message: "Type of 'IBAN' attribute?",
                input: `${Array(13).fill(KEYS.DOWN).join("")}${KEYS.ENTER}`
            },
            {
                message: "Name of attribute?",
                input: KEYS.ENTER
            },
            ...getGenerateCommandPromptInputs([
                "",
                "",
                "",
                "test",
                "",
                "",
                "test",
                "https://test.datapm-not-a-site.io",
                "10",
                ""
            ])
        ];

        const unitPrompts = [
            {
                message: "What does each random record represent?",
                input: "country\n"
            }
        ];

        prompts.splice(11, 0, ...unitPrompts);

        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd("package", ["test://"], prompts, (line: string) => {
            if (line.includes("datapm publish ")) {
                results.messageFound = true;
            }
        });

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found success message").equals(true);
    });

    it("Validate the contents of the JSON file", async function () {
        const packageFile = loadPackageFileFromDisk("test.datapm.json");
        expect(packageFile.schemas.length).equals(1);
        const properties = packageFile.schemas[0].properties as Properties;

        const companyProperty = properties.Company as Schema;
        expect(companyProperty.title).equal("Company");
        expect(companyProperty.recordCount).equal(10);
        expect(companyProperty.format).equal("string");
        expect(companyProperty.type).include.members(["string"]);

        const ibanProperty = properties.IBAN as Schema;
        expect(ibanProperty.title).equal("IBAN");
        expect(ibanProperty.recordCount).equal(10);
        expect(ibanProperty.format).equal("string");
        expect(ibanProperty.type).include.members(["string"]);
    });
});
