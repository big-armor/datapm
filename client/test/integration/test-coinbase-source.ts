import { expect } from "chai";
import { loadPackageFileFromDisk } from "datapm-lib";
import { describe } from "mocha";
import { KEYS, testCmd } from "./test-utils";

describe("Coinbase Source", () => {
    it("Should create a package from coinbase", async () => {
        let messageFound = false;
        const cmdResult = await testCmd(
            "package",
            ["--inspectionSeconds=2"],
            [
                {
                    message: "Source?",
                    input: "Coinbase" + KEYS.ENTER
                },
                {
                    message: "Select target pairs",
                    input: "BTC/USD " + KEYS.ENTER
                },
                {
                    message: "Exclude any attributes from ticker?",
                    input: "No" + KEYS.ENTER
                },
                {
                    message: "Rename attributes from ticker?",
                    input: "No" + KEYS.ENTER
                },
                {
                    message: "Was ticker derived from other 'upstream data'?",
                    input: "No" + KEYS.ENTER
                },
                {
                    message: "What does each ticker record represent?",
                    input: "tick" + KEYS.ENTER
                },
                {
                    message: "Do you want to specify units",
                    input: "No" + KEYS.ENTER
                },
                {
                    message: "User friendly package name?",
                    input: "Coinbase BTC-USD Ticker" + KEYS.ENTER
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
                    input: "Streaming tickers for BTC/USD from Coinbase" + KEYS.ENTER
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
                    input: "No" + KEYS.ENTER
                }
            ],
            async (line: string) => {
                console.log(line);
                if (line.includes("When you are ready, you can publish with the following command")) {
                    messageFound = true;
                }
            }
        );

        expect(cmdResult.code, "Exit code").equals(0);
        expect(messageFound, "Found warning message").equals(true);

        const packageFile = loadPackageFileFromDisk("coinbase-btc-usd-ticker.datapm.json");
        expect(packageFile.schemas[0].sampleRecords?.length).to.be.greaterThan(0);
    });
});
