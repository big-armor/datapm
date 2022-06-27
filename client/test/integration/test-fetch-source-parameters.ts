import {
    createApiKey,
    createTestPackage,
    createTestUser,
    KEYS,
    removePackageFiles,
    TEST_SOURCE_FILES,
    testCmd,
    loadTestPackageFile
} from "./test-utils";
import { expect } from "chai";
import { addRegistry, resetConfiguration } from "../../src/util/ConfigUtil";
import { registryServerPort } from "./setup";
import fs from "fs";
import path from "path";

/** Tests the use case when a package does not contain all parameters necessary for the source */
describe("Fetch Missing Source Parameters", function () {
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
        removePackageFiles(["airports-small"]);
        if (fs.existsSync("tmp-files")) fs.rmSync("tmp-files", { recursive: true });
    });

    it("Should read CSVs with quotes", async () => {
        await createTestPackage(TEST_SOURCE_FILES.FILE9, true, "airports-small", "Small selection of airports", "", [
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
        ]);

        const packageFile = loadTestPackageFile("airports-small");

        expect(packageFile.displayName).equal("airports-small");
        expect(packageFile.schemas[0].recordCount).equal(99);
    });

    let fetchSuggestCommand = "";

    it("Should prompt for missing parameters", async () => {
        const packageFile = loadTestPackageFile("airports-small");

        delete packageFile.sources[0].configuration?.headerRowNumber;

        fs.writeFileSync("airports-small.datapm.json", JSON.stringify(packageFile, null, 2));

        const result = await testCmd(
            "fetch",
            ["airports-small.datapm.json"],
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
                    message: "Header row line number?",
                    input: "1" + KEYS.ENTER
                },
                {
                    message: "Sink Connector?",
                    input: "Local " + KEYS.ENTER
                },
                {
                    message: "File format?",
                    input: "JSON" + KEYS.ENTER
                },
                {
                    message: "File Location?",
                    input: "tmp-files/airports-small" + KEYS.ENTER
                }
            ],
            async (line) => {
                if (line.includes("datapm fetch airports-small.datapm.json")) {
                    fetchSuggestCommand = line;
                }
            }
        );

        expect(result.code).eq(0);

        const dataDirectory = path.join(process.cwd(), "tmp-files", "airports-small");
        const dataFilePath = path.join(dataDirectory, "airports-small.json");

        const lineCount = await new Promise<number>((resolve, reject) => {
            let count = 0;
            fs.createReadStream(dataFilePath)
                .on("data", function (chunk) {
                    for (let i = 0; i < chunk.length; ++i) if (chunk[i] === 10) count++;
                })
                .on("error", function (error) {
                    reject(error);
                })
                .on("end", function () {
                    resolve(count);
                });
        });

        expect(lineCount).eq(99);

        const lines = fetchSuggestCommand.split("\n");
        const targetLine = lines.find((line) => line.startsWith("datapm fetch airports-small.datapm.json"));

        expect(targetLine).not.eq(undefined);
        expect(targetLine).include('--packageSourceConfig \'{"file":{"headerRowNumber":1}}\'');

        fetchSuggestCommand = targetLine as string;

        fs.rmSync(dataDirectory, { recursive: true });
    });

    it("Should not prompt for any parameters", async () => {
        const allCommandParts = fetchSuggestCommand.split(" ");
        const argumentParts = allCommandParts.slice(2);
        const argumentsQuoteStripped = argumentParts.map((part) => part.trim().replace(/^'/g, "").replace(/'$/g, ""));

        const packageFile = loadTestPackageFile("airports-small");

        delete packageFile.sources[0].configuration?.headerRowNumber;

        fs.writeFileSync("airports-small.datapm.json", JSON.stringify(packageFile, null, 2));

        const result = await testCmd("fetch", argumentsQuoteStripped, []);

        expect(result.code).eq(0);

        const dataFilePath = path.join(process.cwd(), "tmp-files/airports-small/airports-small.json");

        const lineCount = await new Promise<number>((resolve, reject) => {
            let count = 0;
            fs.createReadStream(dataFilePath)
                .on("data", function (chunk) {
                    for (let i = 0; i < chunk.length; ++i) if (chunk[i] === 10) count++;
                })
                .on("error", function (error) {
                    reject(error);
                })
                .on("end", function () {
                    resolve(count);
                });
        });

        expect(lineCount).eq(99);
    });
});
