// import { expect } from "chai";
// import { loadPackageFileFromDisk } from "datapm-lib";
import { describe } from "mocha";
// import { KEYS, testCmd } from "./test-utils";
import fs from "fs";

describe("FTX Source", () => {
    after(() => {
        if (fs.existsSync("ftx-btc-usd-trades.datapm.json")) {
            fs.unlinkSync("ftx-btc-usd-trades.datapm.json");
            fs.unlinkSync("ftx-btc-usd-trades.README.md");
            fs.unlinkSync("ftx-btc-usd-trades.LICENSE.md");
        }
        if (fs.existsSync("trades.csv")) {
            fs.unlinkSync("trades.csv");
        }
    });

    // Not enough trades per second to garauntee these tests

    /* it("Should create a package from ftx", async () => {
        let messageFound = false;
        const cmdResult = await testCmd(
            "package",
            ["--inspectionSeconds=5"],
            [
                {
                    message: "Source?",
                    input: "FTX" + KEYS.ENTER
                },
                {
                    message: "Select instance",
                    input: "ftx.com" + KEYS.ENTER
                },
                {
                    message: "Select channels",
                    input: "trades " + KEYS.ENTER
                },
                {
                    message: "Select target pairs",
                    input: "BTC/USD " + KEYS.ENTER
                },
                {
                    message: "Exclude any attributes from trades?",
                    input: "No" + KEYS.ENTER
                },
                {
                    message: "Rename attributes from trades?",
                    input: "No" + KEYS.ENTER
                },
                {
                    message: "Was trades derived from other 'upstream data'?",
                    input: "No" + KEYS.ENTER
                },
                {
                    message: "What does each trades record represent?",
                    input: "trade" + KEYS.ENTER
                },
                {
                    message: "Do you want to specify units",
                    input: "No" + KEYS.ENTER
                },
                {
                    message: "User friendly package name?",
                    input: "FTX BTC-USD trades" + KEYS.ENTER
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
                    input: "Streaming trades for BTC/USD from FTX" + KEYS.ENTER
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

        const packageFile = loadPackageFileFromDisk("ftx-btc-usd-trades.datapm.json");
        expect(packageFile.schemas[0].sampleRecords?.length).to.be.greaterThan(0);
    });

    let lineCount = 0;

    it("Should write records to local file", async () => {
        let timeout: NodeJS.Timeout | undefined;

        const cmdResult = await testCmd(
            "fetch",
            ["ftx-btc-usd-trades.datapm.json"],
            [
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
                console.log(line);
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
            fs.createReadStream("trades.csv")
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
            ["ftx-btc-usd-trades.datapm.json"],
            [
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
            fs.createReadStream("trades.csv")
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

    */
});
