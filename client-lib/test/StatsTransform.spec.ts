/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { expect } from "chai";
import { RecordContext } from "datapm-lib";
import { test } from "mocha";
import moment from "moment";
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
                },
                receivedDate: new Date()
            },
            {
                schemaSlug: "test",
                record: {
                    integer: Number.MAX_SAFE_INTEGER,
                    number: Number.MAX_VALUE
                },
                receivedDate: new Date()
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

        expect(statsTransform.schemas.test.properties?.integer).not.equal(undefined);
        expect(statsTransform.schemas.test.properties?.integer.types.integer?.numberMaxPrecision).equal(16);
        expect(statsTransform.schemas.test.properties?.integer.types.integer?.numberMaxScale).equal(0);

        expect(statsTransform.schemas.test.properties?.number).not.equal(undefined);
        expect(statsTransform.schemas.test.properties?.number.types?.number?.numberMaxPrecision).equal(22);
        expect(statsTransform.schemas.test.properties?.number.types?.number?.numberMaxScale).equal(21);
    });

    test("Test Dates", async () => {
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
                    date: moment().format("YYYY-MM-DD"),
                    dateTime: moment().toISOString()
                },
                receivedDate: new Date()
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

        expect(statsTransform.schemas.test.properties?.date).not.equal(undefined);
        expect(statsTransform.schemas.test.properties?.date.types.date).not.equal(undefined);

        expect(statsTransform.schemas.test.properties?.dateTime).not.equal(undefined);
        expect(statsTransform.schemas.test.properties?.dateTime.types["date-time"]).not.equal(undefined);
    });
});
