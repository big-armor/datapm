import {
    createApiKey,
    createTestPackage,
    createTestUser,
    KEYS,
    removePackageFiles,
    TEST_SOURCE_FILES,
    testCmd
} from "./test-utils";
import { loadPackageFileFromDisk } from "datapm-lib";
import { expect } from "chai";
import { addRegistry, resetConfiguration } from "../../src/util/ConfigUtil";
import { registryServerPort } from "./setup";
import fs from "fs";
import path from "path";

/** Tests the use case when a package does not contain all parameters necessary for the source */
describe("Fetch Missing Source Parameters", function () {
    let packageFilePath: string;

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
        packageFilePath = await createTestPackage(
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

        const packageFile = loadPackageFileFromDisk(packageFilePath);

        expect(packageFilePath.endsWith("airports-small.datapm.json")).eq(true);
        expect(packageFile.displayName).equal("airports-small");
        expect(packageFile.schemas[0].recordCount).equal(99);
    });

    it("Should prompt for missing parameters", async () => {
        const packageFile = loadPackageFileFromDisk(packageFilePath);

        delete packageFile.sources[0].configuration?.headerRowNumber;

        fs.writeFileSync("airports-small.datapm.json", JSON.stringify(packageFile, null, 2));

        const result = await testCmd(
            "fetch",
            ["airports-small.datapm.json"],
            [
                {
                    message: "Header row line number?",
                    input: "1" + KEYS.ENTER
                },
                {
                    message: "Connector?",
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
            async (line: string) => {
                console.log(line);
            }
        );

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
