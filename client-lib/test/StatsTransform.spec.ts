/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { expect } from "chai";
import { RecordContext } from "datapm-lib";
import { test } from "mocha";
import { Writable } from "stream";
import { ContentLabelDetector } from "../src/content-detector/ContentLabelDetector";
import { StatsTransform } from "../src/transforms/StatsTransform";

describe("Stats transform", () => {
    test("Test numbers", async () => {
        const statsTransform = new StatsTransform(
            () => {
                // nothing to do
            },
            {
                test: {
                    title: "test",
                    properties: {}
                }
            },
            new ContentLabelDetector(),
            {
                objectMode: true
            }
        );

        const recordContexts: RecordContext[] = [
            {
                schemaSlug: "test",
                record: {
                    integer: "101",
                    number: "101.2"
                }
            },
            {
                schemaSlug: "test",
                record: {
                    integer: Number.MAX_SAFE_INTEGER,
                    number: Number.MAX_VALUE
                }
            }
        ];

        statsTransform.write(recordContexts);

        const writable = new Writable({
            objectMode: true,
            write: (chunk, encoding, callback) => {
                callback();
            }
        });

        await new Promise<void>((resolve, reject) => {
            statsTransform.on("finish", () => {
                resolve();
            });
            statsTransform.pipe(writable);
            statsTransform.end();
        });

        expect(statsTransform.schemas.test.properties?.integer.format).equal("integer");
        expect(statsTransform.schemas.test.properties?.integer.valueTypes?.integer?.valueType).equal("integer");
        expect(statsTransform.schemas.test.properties?.integer.valueTypes?.integer?.numberMaxPrecision).equal(16);
        expect(statsTransform.schemas.test.properties?.integer.valueTypes?.integer?.numberMaxScale).equal(0);

        expect(statsTransform.schemas.test.properties?.number.format).equal("number");
        expect(statsTransform.schemas.test.properties?.number.valueTypes?.number?.valueType).equal("number");
        expect(statsTransform.schemas.test.properties?.number.valueTypes?.number?.numberMaxPrecision).equal(22);
        expect(statsTransform.schemas.test.properties?.number.valueTypes?.number?.numberMaxScale).equal(21);
    });
});
