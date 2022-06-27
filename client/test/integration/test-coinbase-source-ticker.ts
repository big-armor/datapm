/***
 * 
 * Not always enough data to test
 * 
 * import { expect } from "chai";
import { loadTestPackageFile } from "datapm-lib";
import { describe } from "mocha";
import { KEYS, testCmd } from "./test-utils";
import fs from "fs";

describe("Coinbase Ticker Source", () => {
    after(() => {
        removePackageFiles(["coinbase-btc-usd-ticker"]);

        if (fs.existsSync("ticker.csv")) {
            fs.unlinkSync("ticker.csv");
        }
    });

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
                    message: "Select channels",
                    input: "ticker " + KEYS.ENTER
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
                if (line.includes("When you are ready, you can publish with the following command")) {
                    messageFound = true;
                }
            }
        );

        expect(cmdResult.code, "Exit code").equals(0);
        expect(messageFound, "Found warning message").equals(true);

        const packageFile = loadTestPackageFile("coinbase-btc-usd-ticker");
        expect(packageFile.schemas[0].sampleRecords?.length).to.be.greaterThan(0);
    });

    let lineCount = 0;

    it("Should write records to local file", async () => {
        let timeout: NodeJS.Timeout | undefined;

        const cmdResult = await testCmd(
            "fetch",
            ["local/coinbase-btc-usd-ticker"],
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
                    input: "Local File" + KEYS.ENTER
                },
                {
                    message: "File format?",
                    input: "CSV" + KEYS.ENTER
                },
                {
                    message: "File Location?",
                    input: "./" + KEYS.ENTER
                },
                {
                    message: "Include header row?",
                    input: "Yes" + KEYS.ENTER
                },
                {
                    message: "Wrap all values in quotes?",
                    input: "Yes" + KEYS.ENTER
                }
            ],
            async (line, index, cmdProcess) => {
                if (timeout == null) {
                    timeout = setTimeout(() => {
                        cmdProcess.kill("SIGINT");
                    }, 2000);
                }
            }
        );

        expect(cmdResult.code).to.equal(0);

        lineCount = await new Promise<number>((resolve, reject) => {
            let count = 0;
            fs.createReadStream("ticker.csv")
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

        expect(lineCount).to.be.greaterThan(1);
    });

    it("Should write more records to local file", async () => {
        let timeout: NodeJS.Timeout | undefined;

        const cmdResult = await testCmd(
            "fetch",
            ["local/coinbase-btc-usd-ticker"],
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
                    input: "Local File" + KEYS.ENTER
                },
                {
                    message: "File format?",
                    input: "CSV" + KEYS.ENTER
                },
                {
                    message: "File Location?",
                    input: "./" + KEYS.ENTER
                },
                {
                    message: "Include header row?",
                    input: "Yes" + KEYS.ENTER
                },
                {
                    message: "Wrap all values in quotes?",
                    input: "Yes" + KEYS.ENTER
                }
            ],
            async (line, index, cmdProcess) => {
                if (timeout == null) {
                    timeout = setTimeout(() => {
                        cmdProcess.kill("SIGINT");
                    }, 2000);
                }
            }
        );

        expect(cmdResult.code).to.equal(0);

        const secondLineCount = await new Promise<number>((resolve, reject) => {
            let count = 0;
            fs.createReadStream("ticker.csv")
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

        expect(secondLineCount).to.be.greaterThan(lineCount);
    });
});
**/
