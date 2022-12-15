/** 
 * Disabled for failing tests pulling records 
 * import { expect } from "chai";
import { describe } from "mocha";
import { KEYS, removePackageFiles, testCmd } from "./test-utils";
import fs from "fs";

describe("Binance Source", () => {
    after(() => {
        removePackageFiles(["binance-btc-usdc-ticker"]);

        if (fs.existsSync("bookTicker.csv")) {
            fs.unlinkSync("bookTicker.csv");
        }
    });

    let lineCount = 0;

    const prompts = [
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
            input: "BTC/USDT " + KEYS.ENTER
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
    ];

    it("Should write records to local file", async () => {
        let timeout: NodeJS.Timeout | undefined;

        const cmdResult = await testCmd("fetch", ["binance"], prompts, async (line, index, cmdProcess) => {
            if (timeout == null) {
                timeout = setTimeout(() => {
                    cmdProcess.kill("SIGINT");
                }, 7000);

                setTimeout(() => {
                    cmdProcess.kill("SIGINT");
                }, 10000);
            }
        });

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
});
**/
