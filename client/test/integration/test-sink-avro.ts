import avro from "avsc";
import { expect } from "chai";
import { createTestPackage, getPromptInputs, testCmd, TEST_SOURCE_FILES, removePackageFiles, KEYS } from "./test-utils";
import fs from "fs";

describe("AVRO Sink Test", function () {
    let packageAFilePath: string;
    let packageBFilePath: string;
    let packageCFilePath: string;

    before(async () => {
        cleanup();
        packageAFilePath = await createTestPackage(
            TEST_SOURCE_FILES.FILE22,
            true,
            "covid-02-01-2020",
            "Test",
            '{"parserMimeType":"application/avro"}'
        );

        packageBFilePath = await createTestPackage(
            TEST_SOURCE_FILES.FILE26,
            true,
            "weird-headers",
            "Test with odd headers",
            '{"parserMimeType":"text/csv"}'
        );

        packageCFilePath = "test/packages/coinbase-btc-usd.datapm.json";
    });

    after(async () => {
        cleanup();
    });

    it("Should write AVRO output", async () => {
        const prompts = getPromptInputs(
            ["Exclude any attributes from", "Rename attributes from", "File Location?"],
            ["No", "No", "."]
        );
        const cmdResult = await testCmd(
            "fetch",
            [packageAFilePath, "--sinkType", "file", "--sinkConfig", '{"format":"application/avro"}'],
            prompts
        );

        expect(cmdResult.code, "Exit code").equals(0);
    });

    it("Should read covid avro file", async () => {
        // eslint-disable-next-line
        let content: any[] = [];
        await new Promise<void>((resolve) => {
            avro.createFileDecoder("covid-02-01-2020.avro")
                .on("data", (data) => {
                    content.push(data);
                })
                .on("end", resolve);
        });
        expect(content.length).equals(67);
        const firstRecord = content[0];
        expect(firstRecord.Province_State).equals("Hubei");
        expect(firstRecord.Country_Region).equals("Mainland China");
        expect(firstRecord.Last_Update).equals("2/1/2020 11:53");
        expect(firstRecord.Confirmed).equals(7153);
        expect(firstRecord.Deaths).equals(249);
        expect(firstRecord.Recovered).equals(168);
    });

    it("Should write AVRO output - even with weird headers", async () => {
        const prompts = getPromptInputs(
            ["Exclude any attributes from", "Rename attributes from", "File Location?"],
            ["No", "No", "."]
        );
        const cmdResult = await testCmd(
            "fetch",
            [packageBFilePath, "--sinkType", "file", "--sinkConfig", '{"format":"application/avro"}'],
            prompts
        );

        expect(cmdResult.code, "Exit code").equals(0);
    });

    it("Should read weird-headers avro file", async () => {
        // eslint-disable-next-line
        let content: any[] = [];
        await new Promise<void>((resolve) => {
            avro.createFileDecoder("weird-headers.avro")
                .on("data", (data) => {
                    content.push(data);
                })
                .on("end", resolve);
        });
        expect(content.length).equals(1);
        const firstRecord = content[0];
        expect(firstRecord.normal).equals("normal");
        expect(firstRecord.exclamation).equals("exclamation");
        expect(firstRecord.questionMark).equals("questionMark");
    });

    it("Should write AVRO with floating point numbers", async () => {
        const prompts = getPromptInputs(
            [
                "Exclude any attributes from",
                "Rename attributes from",
                "File Location?",
                "Column1 has integer and number values",
                "Column2 has integer and number values. How should this output be handled?"
            ],
            ["No", "No", ".", KEYS.ENTER, KEYS.ENTER]
        );
        const cmdResult = await testCmd(
            "fetch",
            [packageCFilePath, "--sinkType", "file", "--sinkConfig", '{"format":"application/avro"}'],
            prompts
        );

        expect(cmdResult.code, "Exit code").equals(0);
    });

    it("Should read btc-usd avro file", async () => {
        // eslint-disable-next-line
        let content: any[] = [];
        await new Promise<void>((resolve) => {
            avro.createFileDecoder("coinbaseUSD-small.avro")
                .on("data", (data) => {
                    content.push(data);
                })
                .on("end", resolve);
        });
        expect(content.length).equals(100);
        const firstRecord = content[0];
        expect(firstRecord.Column0).equals(1417412036);
        expect(firstRecord.Column1).equals(300.0);
        expect(firstRecord.Column2).equals(0.01);
    });
});

function cleanup() {
    if (fs.existsSync("covid-02-01-2020.avro")) fs.unlinkSync("covid-02-01-2020.avro");
    if (fs.existsSync("local-covid-02-01-2020-1-state.json")) fs.unlinkSync("local-covid-02-01-2020-1-state.json");
    if (fs.existsSync("weird-headers.avro")) fs.unlinkSync("weird-headers.avro");
    if (fs.existsSync("local-weird-headers-1-state.json")) fs.unlinkSync("local-weird-headers-1-state.json");
    if (fs.existsSync("coinbaseUSD-small.avro")) fs.unlinkSync("coinbaseUSD-small.avro");
    if (fs.existsSync("local-coinbase-btc-usd-1-state.json")) fs.unlinkSync("local-coinbase-btc-usd-1-state.json");

    removePackageFiles(["covid-02-01-2020", "weird-headers", "coinbase-usd-btc"]);
}
