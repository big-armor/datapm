import { expect } from "chai";
import fs from "fs";
import { test } from "mocha";
import { Transform } from "stream";

import { CSVParser } from "../src/parser/CSVParser";
import { RecordContext } from "../src/source/Source";

describe("Checking transforms", () => {
    test("DPM record transform test", () => {
        const csvContent = `
      "String", "Boolean", "BigInt", "Integer", "Float", "Date", "DateTime"
      "string1", "true", "1000000000", "100000", "1000.00", "2020/11/11", "2020-11-11 11:11"
      "string2", "false", "1000000001", "100001", "1000.01", "2020/11/12", "2020-11-11 11:12"
    `;
        fs.writeFileSync("test.csv", csvContent);
        const stream = fs.createReadStream("test.csv");

        const csvParser = new CSVParser();
        const transforms = csvParser.getTransforms(
            "test",
            {
                hasHeaderRow: "true",
                headerRowNumber: 0
            },
            {
                schemaStates: {}
            }
        );

        let recordIndex = 0;

        stream
            .pipe(transforms[0])
            .pipe(transforms[1])
            .pipe(transforms[2])
            .pipe(transforms[3])
            .pipe(transforms[4])
            .pipe(
                new Transform({
                    objectMode: true,
                    transform: function (recordContext: RecordContext, encoding, callback) {
                        Object.values(recordContext.record).forEach((value) => {
                            expect(typeof value).equal("string");
                        });
                        if (recordIndex === 0) {
                            expect(recordContext.record).to.include({
                                String: "string1",
                                Boolean: "true",
                                BigInt: "1000000000",
                                Integer: "100000",
                                Float: "1000.00",
                                Date: "2020/11/11",
                                DateTime: "2020-11-11 11:11"
                            });
                        }
                        if (recordIndex === 1) {
                            expect(recordContext.record).to.include({
                                String: "string2",
                                Boolean: "false",
                                BigInt: "1000000001",
                                Integer: "100001",
                                Float: "1000.01",
                                Date: "2020/11/12",
                                DateTime: "2020-11-11 11:12"
                            });
                        }
                        recordIndex += 1;
                        callback();
                    }
                })
            )
            .on("finish", () => {
                fs.unlinkSync("test.csv");
            });
    });
});
