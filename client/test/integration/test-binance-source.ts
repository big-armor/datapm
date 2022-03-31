import { expect } from "chai";
import { loadPackageFileFromDisk } from "datapm-lib";
import { describe } from "mocha";
import { KEYS, testCmd } from "./test-utils";
import fs from "fs";

describe("Binance Source", () => {
    it("Should create a package from binance", async () => {
        let messageFound = false;
        const cmdResult = await testCmd(
            "package",
            ["--inspectionSeconds=7"],
            [
                {
                    message: "Source?",
                    input: "Binance" + KEYS.ENTER
                },
                {
                    message: "Select instance",
                    input: "binance.com" + KEYS.ENTER
                },
                {
                    message: "Select channel",
                    input: "Book ticker" + KEYS.ENTER
                },
                {
                    message: "Select target pairs",
                    input: "BTC/USDC " + KEYS.ENTER
                },
                {
                    message: "Exclude any attributes from bookTicker?",
                    input: "No" + KEYS.ENTER
                },
                {
                    message: "Rename attributes from bookTicker?",
                    input: "No" + KEYS.ENTER
                },
                {
                    message: "Was bookTicker derived from other 'upstream data'?",
                    input: "No" + KEYS.ENTER
                },
                {
                    message: "What does each bookTicker record represent?",
                    input: "tick" + KEYS.ENTER
                },
                {
                    message: "Do you want to specify units",
                    input: "No" + KEYS.ENTER
                },
                {
                    message: "User friendly package name?",
                    input: "Binance BTC-USDC Ticker" + KEYS.ENTER
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
                    input: "Streaming tickers for BTC/USD from Binance" + KEYS.ENTER
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

        const packageFile = loadPackageFileFromDisk("binance-btc-usdc-ticker.datapm.json");
        expect(packageFile.schemas[0].sampleRecords?.length).to.be.greaterThan(0);
    });

    let lineCount = 0;

    it("Should write records to local file", async () => {
        let timeout: NodeJS.Timeout | undefined;

        const cmdResult = await testCmd(
            "fetch",
            ["binance-btc-usdc-ticker.datapm.json"],
            [
                {
                    message: "Connector?",
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
                    }, 7000);
                }
            }
        );

        expect(cmdResult.code).to.equal(0);

        lineCount = await new Promise<number>((resolve, reject) => {
            let count = 0;
            fs.createReadStream("bookTicker.csv")
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
            ["binance-btc-usdc-ticker.datapm.json"],
            [
                {
                    message: "Connector?",
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
                    }, 7000);
                }
            }
        );

        expect(cmdResult.code).to.equal(0);

        const secondLineCount = await new Promise<number>((resolve, reject) => {
            let count = 0;
            fs.createReadStream("bookTicker.csv")
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
