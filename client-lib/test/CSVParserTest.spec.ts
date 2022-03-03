import { expect } from "chai";
import { RecordContext } from "datapm-lib";
import fs from "fs";
import { test } from "mocha";
import { Writable } from "stream";

import { CSVParser } from "../src/connector/file-based/parser/CSVParser";

describe("Checking transforms", () => {
    test("DPM record transform test", async () => {
        const csvContent = `"String", "Boolean", "BigInt", "Integer", "Float", "Date", "DateTime"
"string1", "true", "1000000000", "100000", "1000.00", "2020/11/11", "2020-11-11 11:11"
"string2", "false", "1000000001", "100001", "1000.01", "2020/11/12", "2020-11-11 11:12"`;
        fs.writeFileSync("test.csv", csvContent);
        const stream = fs.createReadStream("test.csv");

        const csvParser = new CSVParser();
        const transforms = csvParser.getTransforms(
            "test",
            {
                hasHeaderRow: "true",
                headerRowNumber: 0,
                delimiter: ","
            },
            {
                schemaStates: {}
            }
        );

        const chunks: RecordContext[][] = [];

        await new Promise<void>((resolve) => {
            stream
                .pipe(transforms[0])
                .pipe(transforms[1])
                .pipe(transforms[2])
                .pipe(transforms[3])
                .pipe(
                    new Writable({
                        objectMode: true,
                        write: function (chunk, encoding, callback) {
                            chunks.push(chunk);
                            callback();
                        }
                    })
                )
                .on("error", (err) => {
                    console.log(err);
                })
                .on("finish", () => {
                    fs.unlinkSync("test.csv");
                    resolve();
                });
        });

        expect(chunks[0][0].record).to.include({
            String: "string1",
            Boolean: "true",
            BigInt: "1000000000",
            Integer: "100000",
            Float: "1000.00",
            Date: "2020/11/11",
            DateTime: "2020-11-11 11:11"
        });

        expect(chunks[0][1].record).to.include({
            String: "string2",
            Boolean: "false",
            BigInt: "1000000001",
            Integer: "100001",
            Float: "1000.01",
            Date: "2020/11/12",
            DateTime: "2020-11-11 11:12"
        });
    });
});
