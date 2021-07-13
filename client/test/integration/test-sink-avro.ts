import avro from "avsc";
import { expect } from "chai";
import { createTestPackage, getPromptInputs, testCmd, TEST_SOURCE_FILES, removePackageFiles, KEYS } from "./test-utils";
import fs from "fs";

describe("AVRO Sink Test", function () {
    let packageAFilePath: string;

    before(async () => {
        packageAFilePath = await createTestPackage(
            TEST_SOURCE_FILES.FILE22,
            true,
            "covid-02-01-2020",
            "Test",
            '{"parserMimeType":"application/avro"}'
        );
    });

    after(async () => {
        fs.unlinkSync("covid-02-01-2020.avro");
        fs.unlinkSync("_no_catalog-covid-02-01-2020-1-state.json");
        removePackageFiles(["covid-02-01-2020"]);
    });

    it("Should write AVRO output", async () => {
        const prompts = getPromptInputs(
            ["Do you want to use the default options?", "File Location?"],
            [KEYS.DOWN, "."]
        );
        const cmdResult = await testCmd(
            "fetch",
            [packageAFilePath, "--sink", "file", "--sinkConfig", '{"format":"application/avro"}'],
            prompts
        );

        expect(cmdResult.code, "Exit code").equals(0);
    });

    it("Should read avro file", async () => {
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
});
