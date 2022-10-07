/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { expect } from "chai";
import { ContentLabel, RecordContext, RecordStreamContext, UpdateMethod } from "datapm-lib";
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

        const recordStreamContexts: RecordStreamContext[] = recordContexts.map((r) => {
            return {
                recordContext: r,
                sourceType: "test",
                sourceSlug: "test",
                streamSetSlug: "test",
                streamSlug: "test",
                updateMethod: UpdateMethod.BATCH_FULL_SET
            };
        });

        statsTransform.write(recordStreamContexts);

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

        const recordStreamContexts: RecordStreamContext[] = recordContexts.map((r) => {
            return {
                recordContext: r,
                sourceType: "test",
                sourceSlug: "test",
                streamSetSlug: "test",
                streamSlug: "test",
                updateMethod: UpdateMethod.BATCH_FULL_SET
            };
        });

        statsTransform.write(recordStreamContexts);

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
        expect(statsTransform.schemas.test.properties?.date.types.date).equal(undefined);
        expect(statsTransform.schemas.test.properties?.date.types.string).not.equal(undefined);

        expect(statsTransform.schemas.test.properties?.dateTime).not.equal(undefined);
        expect(statsTransform.schemas.test.properties?.dateTime.types["date-time"]).equal(undefined);
        expect(statsTransform.schemas.test.properties?.dateTime.types.string).not.equal(undefined);
    });

    test("Test objects", async () => {
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
            {
                objectMode: true
            }
        );

        const recordContexts: RecordContext[] = [
            {
                schemaSlug: "test",
                record: {
                    testObject: {
                        string: "test",
                        integer: -1434,
                        number: 1.2,
                        testSubObject: {
                            string: "subObject",
                            integer: 10,
                            number: 24310.2
                        }
                    },
                    number: 101.2
                },
                receivedDate: new Date()
            },
            {
                schemaSlug: "test",
                record: {
                    testObject: {
                        string: "another",
                        integer: 5,
                        number: 5.2,
                        testSubObject: {
                            boolean: false,
                            string: "subObject-2",
                            integer: 190,
                            number: 189.2
                        }
                    },
                    number: 201.2
                },
                receivedDate: new Date()
            }
        ];

        const recordStreamContexts: RecordStreamContext[] = recordContexts.map((r) => {
            return {
                recordContext: r,
                sourceType: "test",
                sourceSlug: "test",
                streamSetSlug: "test",
                streamSlug: "test",
                updateMethod: UpdateMethod.BATCH_FULL_SET
            };
        });

        statsTransform.write(recordStreamContexts);

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

        expect(statsTransform.schemas.test.properties?.testObject?.types.object).not.equal(undefined);

        const firstInteger =
            statsTransform.schemas.test.properties?.testObject?.types.object?.objectProperties?.integer;
        expect(firstInteger?.types.integer?.recordCount).equal(2);
        expect(firstInteger?.types.integer?.numberMaxValue).equal(5);
        expect(firstInteger?.types.integer?.numberMinValue).equal(-1434);

        const firstNumber = statsTransform.schemas.test.properties?.testObject?.types.object?.objectProperties?.number;
        expect(firstNumber?.types.number?.recordCount).equal(2);
        expect(firstNumber?.types.number?.numberMaxValue).equal(5.2);
        expect(firstNumber?.types.number?.numberMinValue).equal(1.2);

        const firstString = statsTransform.schemas.test.properties?.testObject?.types.object?.objectProperties?.string;
        expect(firstString?.types.string?.recordCount).equal(2);
        expect(firstString?.types.string?.stringMaxLength).equal(7);
        expect(firstString?.types.string?.stringOptions?.another).equal(1);
        expect(firstString?.types.string?.stringOptions?.test).equal(1);

        expect(statsTransform.schemas.test.properties?.testObject?.types.object).not.equal(undefined);

        const secondInteger =
            statsTransform.schemas.test.properties?.testObject?.types.object?.objectProperties?.testSubObject.types
                .object?.objectProperties?.integer;
        expect(secondInteger?.types.integer?.recordCount).equal(2);
        expect(secondInteger?.types.integer?.numberMaxValue).equal(190);
        expect(secondInteger?.types.integer?.numberMinValue).equal(10);

        const secondNumber =
            statsTransform.schemas.test.properties?.testObject?.types.object?.objectProperties?.testSubObject.types
                .object?.objectProperties?.number;
        expect(secondNumber?.types.number?.recordCount).equal(2);
        expect(secondNumber?.types.number?.numberMaxValue).equal(24310.2);
        expect(secondNumber?.types.number?.numberMinValue).equal(189.2);

        const secondBoolean =
            statsTransform.schemas.test.properties?.testObject?.types.object?.objectProperties?.testSubObject.types
                .object?.objectProperties?.boolean;
        expect(secondBoolean?.types.boolean?.recordCount).equal(1);
    });

    test("Test content lables on objects", async () => {
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
            {
                objectMode: true
            }
        );

        const recordContexts: RecordContext[] = [
            {
                schemaSlug: "test",
                record: {
                    testObject: {
                        latitude: 80.3,
                        longitude: 23.8
                    },
                    number: "101.2"
                },
                receivedDate: new Date()
            }
        ];

        const recordStreamContexts: RecordStreamContext[] = recordContexts.map((r) => {
            return {
                recordContext: r,
                sourceType: "test",
                sourceSlug: "test",
                streamSetSlug: "test",
                streamSlug: "test",
                updateMethod: UpdateMethod.BATCH_FULL_SET
            };
        });

        statsTransform.write(recordStreamContexts);

        const writable = new Writable({
            objectMode: true,
            write: (chunk, encoding, callback) => {
                callback();
            }
        });

        statsTransform.end();

        await new Promise<void>((resolve, reject) => {
            statsTransform.on("finish", () => {
                resolve();
            });
            statsTransform.pipe(writable);
            statsTransform.end();
        });

        expect(statsTransform.schemas.test.properties?.testObject?.types.object).not.equal(undefined);

        const latitudeProperty =
            statsTransform.schemas.test.properties?.testObject?.types.object?.objectProperties?.latitude;
        expect(latitudeProperty?.types.number?.recordCount).equal(1);
        expect((latitudeProperty?.types.number?.contentLabels as ContentLabel[])[0].label).equal("geo_latitude");

        const longitudeProperty =
            statsTransform.schemas.test.properties?.testObject?.types.object?.objectProperties?.longitude;
        expect(longitudeProperty?.types.number?.recordCount).equal(1);
        expect((longitudeProperty?.types.number?.contentLabels as ContentLabel[])[0].label).equal("geo_longitude");
    });
});
