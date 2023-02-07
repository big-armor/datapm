import { expect } from "chai";
import { KEYS, testCmd, TEST_SOURCE_FILES } from "./test-utils";
import fs from "fs";

describe("Fetch CLI Options", () => {
    let fetchLine: string | undefined;

    it("Fetching should provide cli options", async () => {
        const result = await testCmd(
            "fetch",
            [TEST_SOURCE_FILES.FILE1, "--forceUpdate"],
            [
                {
                    message: "Is there a header line above?",
                    input: "Yes" + KEYS.ENTER
                },
                {
                    message: "Header row line number?",
                    input: "1" + KEYS.ENTER
                },
                {
                    message: "How are files updated?",
                    input: "Edits are made throughout" + KEYS.ENTER
                },
                {
                    message: "Exclude any attributes from",
                    input: "Yes" + KEYS.ENTER
                },
                {
                    message: "Attributes to exclude?",
                    input: " " + KEYS.ENTER // will exclude "Province/State"
                },
                {
                    message: "Rename attributes from",
                    input: "Yes" + KEYS.ENTER
                },
                {
                    message: "Attributes to rename?",
                    input: KEYS.DOWN + " " + KEYS.ENTER // will rename Country/Region
                },
                {
                    message: 'New attribute name for "Country/Region"?',
                    input: "Country" + KEYS.ENTER
                },
                {
                    message: "Sink Connector?",
                    input: "Local File" + KEYS.ENTER
                },
                {
                    message: "File format?",
                    input: "JSON" + KEYS.ENTER
                },
                {
                    message: "File Location?",
                    input: "./" + KEYS.ENTER
                }
            ],
            async (line) => {
                if (line.match("datapm fetch file")) {
                    fetchLine = line;
                }
            }
        );

        expect(result.code).to.equal(0);
        expect(fetchLine).not.equal(undefined);

        const fileContents = fs.readFileSync("./covid-02-01-2020.json", "utf8");
        const fileLines = fileContents.split("\n");
        const data = JSON.parse(fileLines[0]);

        expect(data["Country/Region"]).equal(undefined);
        expect(data["Province/State"]).equal(undefined);
        expect(data.Country).equal("Mainland China");
    });

    it("Printed fetch command should work", async () => {
        if (fetchLine === undefined) throw new Error("fetchLine is undefined");

        const fetchArgsString = fetchLine.replace(/.*datapm fetch /s, "").replace(/[\s\n\r]*$/s, "") + " --forceUpdate";

        const args = fetchArgsString?.split(" ");
        const argsQuoteStripped = args.map((a) => a.replace(/^(')/g, "").replace(/('\n?)$/g, ""));

        let confirmationLineFound = false;
        const result = await testCmd("fetch", argsQuoteStripped, [], async (line) => {
            // console.log(line);
            if (line.includes("Finished writing 67 records")) {
                confirmationLineFound = true;
            }
        });

        expect(result.code).equal(0);
        expect(confirmationLineFound).equal(true);

        const fileContents = fs.readFileSync("./covid-02-01-2020.json", "utf8");
        const fileLines = fileContents.split("\n");
        const data = JSON.parse(fileLines[0]);

        expect(data["Country/Region"]).equal(undefined);
        expect(data["Province/State"]).equal(undefined);
        expect(data.Country).equal("Mainland China");
    });
});
