import {
    createApiKey,
    createTestUser,
    KEYS,
    testCmd,
    removePackageFiles,
    TEST_SOURCE_FILES,
    loadTestPackageFile
} from "./test-utils";
import { SinkState } from "datapm-lib";
import { expect } from "chai";
import { addRegistry, resetConfiguration } from "../../src/util/ConfigUtil";
import { registryServerPort } from "./setup";
import fs from "fs";

function cleanUp() {
    removePackageFiles(["countries"]);
    if (fs.existsSync("countries-v1.json")) fs.unlinkSync("countries-v1.json");
    if (fs.existsSync("countries.csv")) fs.unlinkSync("countries.csv");
    if (fs.existsSync("countries.json")) fs.unlinkSync("countries.json");
    if (fs.existsSync("local-covid-02-01-2020-1-state.json")) fs.unlinkSync("local-covid-02-01-2020-1-state.json");
    if (fs.existsSync("local-countries-1-state.json")) fs.unlinkSync("local-countries-1-state.json");
}

describe("CSV Offset Tests", function () {
    before(async () => {
        resetConfiguration();
        cleanUp();
        const userAClient = await createTestUser();
        const apiKey = await createApiKey(userAClient);
        addRegistry({
            url: `http://localhost:${registryServerPort}`,
            apiKey
        });
    });

    after(() => {
        cleanUp();
    });

    it("Should create a test package", async () => {
        if (fs.existsSync("countries.csv")) {
            fs.unlinkSync("countries.csv");
        }

        fs.copyFileSync(TEST_SOURCE_FILES.FILE19.replace("file://", ""), "countries.csv");

        const prompts = [
            {
                message: "Is there a header line above?",
                input: KEYS.ENTER
            },
            {
                message: "Header row line number?",
                input: KEYS.ENTER
            },
            {
                message: "How are files updated?",
                input: KEYS.DOWN + KEYS.ENTER
            },
            {
                message: "Exclude any attributes",
                input: KEYS.ENTER
            },
            {
                message: "Rename attributes",
                input: KEYS.ENTER
            },
            {
                message: "derived from other 'upstream data'?",
                input: KEYS.ENTER
            },

            {
                message: "What does each countries record represent?",
                input: "country" + KEYS.ENTER
            },
            {
                message: "Unit for attribute 'id'?",
                input: KEYS.ENTER
            },
            {
                message: "User friendly package name?",
                input: "countries" + KEYS.ENTER
            },
            {
                message: "Package short name?",
                input: KEYS.ENTER
            },
            {
                message: "Starting version?",
                input: KEYS.ENTER
            },
            {
                message: "Short package description?",
                input: "somthing short" + KEYS.ENTER
            },
            {
                message: "Website?",
                input: KEYS.ENTER
            },
            {
                message: "Number of sample records?",
                input: KEYS.ENTER
            },
            {
                message: "Publish to registry?",
                input: KEYS.ENTER
            },
            {
                message: "Target registry?",
                input: KEYS.ENTER
            },
            {
                message: "Catalog short name?",
                input: KEYS.ENTER
            },
            {
                message: "Data Access Method?",
                input: "Publish schema, client direct connects for data" + KEYS.ENTER
            },
            {
                message: "Is the above ok?",
                input: "yes" + KEYS.ENTER
            }
        ];

        const exitCode = await testCmd("package", ["file://./countries.csv"], prompts);

        expect(exitCode.code).equal(0);

        const packageFile = loadTestPackageFile("countries");

        expect(packageFile.displayName).equal("countries");
        expect(packageFile.schemas[0].recordCount).equal(5);
    });

    it("Should fetch data first time", async () => {
        const exitCode = await testCmd(
            "fetch",
            ["local/countries"],
            [
                {
                    message: "Exclude any attributes from",
                    input: "No" + KEYS.ENTER
                },
                {
                    message: "Rename attributes from",
                    input: "No" + KEYS.ENTER
                },
                {
                    message: "Sink Connector?",
                    input: "Local" + KEYS.ENTER
                },
                {
                    message: "File format?",
                    input: "JSON" + KEYS.ENTER
                },
                {
                    message: "File Location?",
                    input: "./" + KEYS.ENTER
                }
            ]
        );

        expect(exitCode.code).equal(0);

        const jsonFile = fs.readFileSync("countries.json");

        const jsonFileString = jsonFile.toString();

        const jsonLines = jsonFileString.split("\n").filter((f) => f.trim().length > 0);

        expect(jsonLines.length).equal(5);

        const stateFile = fs.readFileSync("local-countries-1-state.json");

        const state = JSON.parse(stateFile.toString()) as SinkState;

        expect(state.streamSets.countries.streamStates["countries.csv"].streamOffset).equal(4);
    });

    it("Should fetch only additional data the second time", async () => {
        fs.renameSync("countries.json", "countries-v1.json");

        fs.unlinkSync("countries.csv");

        fs.copyFileSync(TEST_SOURCE_FILES.FILE20.replace("file://", ""), "countries.csv");

        const exitCode = await testCmd(
            "fetch",
            ["local/countries"],
            [
                {
                    message: "Exclude any attributes from",
                    input: "No" + KEYS.ENTER
                },
                {
                    message: "Rename attributes from",
                    input: "No" + KEYS.ENTER
                },
                {
                    message: "Sink Connector?",
                    input: "Local" + KEYS.ENTER
                },
                {
                    message: "File format?",
                    input: "JSON" + KEYS.ENTER
                },
                {
                    message: "File Location?",
                    input: "./" + KEYS.ENTER
                }
            ]
        );

        expect(exitCode.code).equal(0);

        const jsonFile = fs.readFileSync("countries.json");

        const jsonFileString = jsonFile.toString();

        const jsonLines = jsonFileString.split("\n").filter((f) => f.trim().length > 0);

        expect(jsonLines.length).equal(3);

        const stateFile = fs.readFileSync("local-countries-1-state.json");

        const state = JSON.parse(stateFile.toString()) as SinkState;

        expect(state.streamSets.countries.streamStates["countries.csv"].streamOffset).equal(7);
    });
});
