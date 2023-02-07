import { expect } from "chai";
import { createTestPackage, getPromptInputs, testCmd, TEST_SOURCE_FILES, removePackageFiles } from "./test-utils";
import fs from "fs";

describe("JSON Sink", function () {
    let packageAFilePath: string;

    const jsonSinkPrompts = ["Exclude any attributes from", "Rename attributes from", "File Location?"];

    const getJSONSinkPrompts = (inputs?: string[], skip = 0, count = 20) =>
        getPromptInputs(jsonSinkPrompts, inputs, skip, count);

    before(async () => {
        if (fs.existsSync("local-covid-02-01-2020-1-state.json")) fs.unlinkSync("local-covid-02-01-2020-1-state.json");
        packageAFilePath = await createTestPackage(TEST_SOURCE_FILES.FILE1, true);
    });

    after(async () => {
        if (fs.existsSync("covid-02-01-2020.json")) fs.unlinkSync("covid-02-01-2020.json");
        if (fs.existsSync("local-covid-02-01-2020-1-state.json")) fs.unlinkSync("local-covid-02-01-2020-1-state.json");
        removePackageFiles(["covid-02-01-2020"]);
    });

    it("Should write JSON output", async () => {
        const prompts = getJSONSinkPrompts(["No", "No", "./"]);

        const cmdResult = await testCmd(
            "fetch",
            [packageAFilePath, "--sinkType", "file", "--sinkConfig", '{"format":"application/json"}'],
            prompts
        );

        expect(cmdResult.code, "Exit code").equals(0);

        const jsonFileContents = fs.readFileSync(("./covid-02-01-2020.json" as unknown) as string);

        const fileLines = jsonFileContents.toString().split("\n");
        expect(fileLines[1]).include(
            '{"Province/State":"Zhejiang","Country/Region":"Mainland China","Last Update":"2020-02-01T10:53:00.000Z","Confirmed":599,"Deaths":0,"Recovered":21}'
        );
        expect(fileLines.length).equal(68);
    });
});
