import { S3 } from "aws-sdk";
import { expect } from "chai";
import { getAllRegions } from "datapm-client-lib";
import {
    createTestPackage,
    getPromptInputs,
    removePackageFiles,
    testCmd,
    TestResults,
    KEYS,
    TEST_SOURCE_FILES
} from "../integration/test-utils";

const s3SinkPrompts = [
    "Exclude any attributes from",
    "Rename attributes from",
    "File format?",
    "Region?",
    "S3 Bucket?",
    "S3 Path?"
];

const getS3SinkPromptInputs = (inputs?: string[], skip = 0, count = 20) =>
    getPromptInputs(s3SinkPrompts, inputs, skip, count);

describe("S3 Sink Test", function () {
    const bucketName = "datapm-test";
    const s3OutputPath = "test/temp/sources";
    let s3Client: S3;
    let packageAFilePath: string;
    let region: string;

    before(async function () {
        s3Client = new S3();
        const allRegions = await getAllRegions();
        const regionIndex = allRegions.findIndex((regionCode) => regionCode === "us-east-2");
        region = Array(regionIndex).fill(KEYS.DOWN).join("");

        packageAFilePath = await createTestPackage(TEST_SOURCE_FILES.FILE1, true);
    });

    after(async function () {
        removePackageFiles(["covid-02-01-2020"]);
        for (const key of ["covid-02-01-2020.json", "local-covid-02-01-2020-1-state.json"]) {
            await s3Client
                .deleteObject({
                    Bucket: bucketName,
                    Key: `${s3OutputPath}/${key}`
                })
                .promise();
        }
    });

    it("Should import data without error", async function () {
        const prompts = getS3SinkPromptInputs(["No", "No", "", region, "", s3OutputPath]);
        const results: TestResults = {
            messageFound: false
        };

        const cmdResult = await testCmd(
            "fetch",
            [packageAFilePath, "--sinkType", "s3"],
            prompts,
            async (line: string, promptIndex: number) => {
                if (promptIndex === prompts.length && line.includes("Finished writing 67 records")) {
                    results.messageFound = true;
                }
            }
        );

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found success message").equals(true);
    });

    it("Should find the record counts and data types in the s3 object", async function () {
        const source = await s3Client
            .getObject({ Bucket: bucketName, Key: `${s3OutputPath}/covid-02-01-2020.json` })
            .promise();
        const records: Record<string, string>[] = (source.Body || "")
            .toString()
            .split("\n")
            .filter(Boolean)
            .map((line) => JSON.parse(line) as Record<string, string>);
        const firstRecord = records[0];
        expect(records.length).equals(67);
        expect(firstRecord["Province/State"]).equals("Hubei");
        expect(firstRecord["Country/Region"]).equals("Mainland China");
        expect(firstRecord["Last Update"]).equals("2/1/2020 11:53");
        expect(firstRecord.Confirmed).equals("7153");
        expect(firstRecord.Deaths).equals("249");
        expect(firstRecord.Recovered).equals("168");
    });

    it("Should find sink states in s3", async function () {
        const source = await s3Client
            .getObject({ Bucket: bucketName, Key: `${s3OutputPath}/local-covid-02-01-2020-1-state.json` })
            .promise();
        const sinkStates = JSON.parse(source.Body?.toString() || "");
        expect(sinkStates.packageVersion, "1.0.0");
        expect(sinkStates).has.property("streamSets");
        expect(sinkStates.streamSets).has.property("covid-02-01-2020");
        expect(sinkStates.streamSets["covid-02-01-2020"]).has.property("streamStates");
        expect(sinkStates.streamSets["covid-02-01-2020"].streamStates).has.property("covid-02-01-2020.csv");
        expect(sinkStates.streamSets["covid-02-01-2020"].streamStates["covid-02-01-2020.csv"]).has.property(
            "schemaStates"
        );
        expect(
            sinkStates.streamSets["covid-02-01-2020"].streamStates["covid-02-01-2020.csv"].schemaStates
        ).has.property("covid-02-01-2020");
        expect(
            sinkStates.streamSets["covid-02-01-2020"].streamStates["covid-02-01-2020.csv"].schemaStates[
                "covid-02-01-2020"
            ]
        ).has.property("lastOffset");
        expect(
            sinkStates.streamSets["covid-02-01-2020"].streamStates["covid-02-01-2020.csv"].schemaStates[
                "covid-02-01-2020"
            ].lastOffset
        ).equals(66);
        expect(sinkStates.streamSets["covid-02-01-2020"].streamStates["covid-02-01-2020.csv"].streamOffset).equals(66);
        expect(sinkStates.streamSets["covid-02-01-2020"].streamStates["covid-02-01-2020.csv"]).has.property(
            "updateHash"
        );
    });

    it("Should not rewrite if there isn't any new records", async function () {
        const prompts = getS3SinkPromptInputs(["No", "No", "", region, "", s3OutputPath]);
        const results: TestResults = {
            messageFound: false
        };

        const cmdResult = await testCmd(
            "fetch",
            [packageAFilePath, "--sinkType", "s3"],
            prompts,
            async (line: string, promptIndex: number) => {
                if (promptIndex === prompts.length && line.includes("No new records available")) {
                    results.messageFound = true;
                }
            }
        );

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found no new records available message").equals(true);
    });

    it("Should import data again if force-update flag set", async function () {
        const prompts = getS3SinkPromptInputs(["No", "No", "", region, "", s3OutputPath]);
        const results: TestResults = {
            messageFound: false
        };

        const cmdResult = await testCmd(
            "fetch",
            [packageAFilePath, "--sinkType", "s3", "--force-update"],
            prompts,
            async (line: string, promptIndex: number) => {
                if (promptIndex === prompts.length && line.includes("Finished writing 67 records")) {
                    results.messageFound = true;
                }
            }
        );

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found success message").equals(true);
    });
});
