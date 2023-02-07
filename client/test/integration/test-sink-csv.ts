import { expect } from "chai";
import { createTestPackage, getPromptInputs, testCmd, KEYS, TEST_SOURCE_FILES, removePackageFiles } from "./test-utils";
import fs from "fs";

describe("CSV Sink", function () {
    let packageAFilePath: string;

    const csvSinkPrompts = [
        "Exclude any attributes from",
        "Rename attributes from",
        "File Location?",
        "Include header row?",
        "Wrap all values in quotes?"
    ];

    const getCSVSinkPrompts = (inputs?: string[], skip = 0, count = 20) =>
        getPromptInputs(csvSinkPrompts, inputs, skip, count);

    before(async () => {
        if (fs.existsSync(" local-covid-02-01-2020-1-state.json"))
            fs.unlinkSync(" local-covid-02-01-2020-1-state.json");
        packageAFilePath = await createTestPackage(TEST_SOURCE_FILES.FILE1, true);
    });

    after(async () => {
        if (fs.existsSync("covid-02-01-2020.csv")) fs.unlinkSync("covid-02-01-2020.csv");
        if (fs.existsSync(" local-covid-02-01-2020-1-state.json"))
            fs.unlinkSync(" local-covid-02-01-2020-1-state.json");
        removePackageFiles(["covid-02-01-2020"]);
    });

    it("Should write headers and quotes by default", async () => {
        const prompts = getCSVSinkPrompts(["No", "No", "./", KEYS.ENTER, KEYS.ENTER]);

        const cmdResult = await testCmd(
            "fetch",
            [packageAFilePath, "--sinkType", "file", "--sinkConfig", '{"format":"text/csv"}', "--force-update"],
            prompts
        );

        expect(cmdResult.code, "Exit code").equals(0);

        const csvFileContents = fs.readFileSync(("./covid-02-01-2020.csv" as unknown) as string);

        const fileLines = csvFileContents.toString().split("\n");
        expect(fileLines[0]).equal('"Province/State","Country/Region","Last Update","Confirmed","Deaths","Recovered"');
        expect(fileLines[1]).equal('"Hubei","Mainland China","2020-02-01T11:53:00.000Z","7153","249","168"');
        expect(fileLines.length).equal(69);
    });

    it("Should not write headers and quotes", async () => {
        const prompts = getCSVSinkPrompts(["No", "No", "./", "n", "n"]);

        const cmdResult = await testCmd(
            "fetch",
            [packageAFilePath, "--sinkType", "file", "--sinkConfig", '{"format":"text/csv"}', "--forceUpdate"],
            prompts
        );

        expect(cmdResult.code, "Exit code").equals(0);

        const csvFileContents = fs.readFileSync(("./covid-02-01-2020.csv" as unknown) as string);

        const fileLines = csvFileContents.toString().split("\n");
        expect(fileLines[0]).equal("Hubei,Mainland China,2020-02-01T11:53:00.000Z,7153,249,168");
        expect(fileLines.length).equal(68);
    });
});
