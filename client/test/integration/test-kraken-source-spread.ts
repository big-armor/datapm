import { expect } from "chai";
import { loadPackageFileFromDisk } from "datapm-lib";
import { describe } from "mocha";
import { KEYS, testCmd } from "./test-utils";
import fs from "fs";

describe("Kraken Source", () => {
    after(() => {
        if (fs.existsSync("kraken-eth-usd-spread.datapm.json")) {
            fs.unlinkSync("kraken-eth-usd-spread.datapm.json");
            fs.unlinkSync("kraken-eth-usd-spread.README.md");
            fs.unlinkSync("kraken-eth-usd-spread.LICENSE.md");
        }
        if (fs.existsSync("spread.csv")) {
            fs.unlinkSync("spread.csv");
        }
    });

    it("Should create a package from kraken", async () => {
        let messageFound = false;
        const cmdResult = await testCmd(
            "package",
            ["--inspectionSeconds=5"],
            [
                {
                    message: "Source?",
                    input: "Kraken" + KEYS.ENTER
                },
                {
                    message: "Select channels",
                    input: "spread " + KEYS.ENTER
                },
                {
                    message: "Select target pairs",
                    input: "ETH/USD " + KEYS.ENTER
                },
                {
                    message: "Exclude any attributes from spread?",
                    input: "No" + KEYS.ENTER
                },
                {
                    message: "Rename attributes from spread?",
                    input: "No" + KEYS.ENTER
                },
                {
                    message: "Was spread derived from other 'upstream data'?",
                    input: "No" + KEYS.ENTER
                },
                {
                    message: "What does each spread record represent?",
                    input: "tick" + KEYS.ENTER
                },
                {
                    message: "Do you want to specify units",
                    input: "No" + KEYS.ENTER
                },
                {
                    message: "User friendly package name?",
                    input: "Kraken ETH-USD Spread" + KEYS.ENTER
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
                    input: "Streaming spreads for ETH/USD from Kraken" + KEYS.ENTER
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

        const packageFile = loadPackageFileFromDisk("kraken-eth-usd-spread.datapm.json");
        expect(packageFile.schemas[0].sampleRecords?.length).to.be.greaterThan(0);
    });

    // const lineCount = 0;

    it("Should write records to local file", async function () {
        this.timeout(12000);
        let timeout: NodeJS.Timeout | undefined;

        const cmdResult = await testCmd(
            "fetch",
            ["kraken-eth-usd-spread.datapm.json"],
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
                    }, 5000);
                }
            }
        );

        expect(cmdResult.code).to.equal(0);

        /* 
        Kraken volume is not high enough to ensure that we get records 

        lineCount = await new Promise<number>((resolve, reject) => {
            let count = 0;
            fs.createReadStream("spread.csv")
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
        */
    });
});
