import { expect } from "chai";
import { Schema } from "datapm-lib";
import { test } from "mocha";
import { combineSchemas } from "../src/util/SchemaUtil";

describe("String value type checks", () => {
    const schemaA1: Schema = {
        title: "testSchema",
        recordCount: 1,
        properties: {
            a: {
                title: "a",
                types: {
                    string: {
                        stringMaxLength: 10,
                        stringMinLength: 5,
                        stringOptions: {
                            a: 1,
                            b: 2,
                            c: 3
                        }
                    }
                },
                description: "test description a1",
                hidden: false,
                unit: "unitA1"
            }
        },
        hidden: false,
        sampleRecords: [
            {
                a: "a"
            }
        ]
    };

    const schemaA2: Schema = {
        title: "testSchema",
        recordCount: 1,
        properties: {
            a: {
                title: "a",
                types: {
                    string: {
                        stringMaxLength: 11,
                        stringMinLength: 6,
                        stringOptions: {
                            a: 2,
                            b: 4,
                            c: 6
                        }
                    }
                },
                description: "test description a2",
                hidden: false,
                unit: "unitA2"
            }
        },
        hidden: false,
        sampleRecords: [
            {
                a: "a"
            }
        ]
    };

    const schemaB1: Schema = {
        title: "testSchema",
        recordCount: 2,
        properties: {
            b: {
                title: "b",
                types: {
                    string: {
                        stringMaxLength: 20,
                        stringMinLength: 10,
                        stringOptions: {
                            x: 1,
                            y: 2,
                            z: 3
                        }
                    }
                },
                description: "test description b",
                hidden: false,
                unit: "unitB"
            }
        },
        hidden: false,
        sampleRecords: [
            {
                b: "b"
            }
        ]
    };

    test("combine similar", () => {
        const combinedSchema = combineSchemas([schemaA1], [schemaA2]);

        expect(combinedSchema.length).equal(1);
        expect(combinedSchema[0].hidden).equal(false);
        expect(combinedSchema[0].title).equal("testSchema");
        expect(combinedSchema[0].recordCount).equal(1);

        expect(Object.keys(combinedSchema[0].properties).length).equal(1);
        expect(combinedSchema[0].properties).to.have.property("a");
        expect(combinedSchema[0].properties.a.types.string?.stringMaxLength).equal(11);
        expect(combinedSchema[0].properties.a.types.string?.stringMinLength).equal(5);
        expect(combinedSchema[0].properties.a.types.string?.stringOptions?.a).to.equal(3);
        expect(combinedSchema[0].properties.a.types.string?.stringOptions?.b).to.equal(6);
        expect(combinedSchema[0].properties.a.types.string?.stringOptions?.c).to.equal(9);
    });

    test("combine dissimilar", () => {
        const combinedSchema = combineSchemas([schemaA1], [schemaB1]);

        expect(combinedSchema.length).equal(1);
        expect(combinedSchema[0].hidden).equal(false);

        expect(combinedSchema[0].properties).to.have.property("a");
        expect(combinedSchema[0].properties.a.types.string?.stringMaxLength).equal(10);
        expect(combinedSchema[0].properties.a.types.string?.stringMinLength).equal(5);
        expect(combinedSchema[0].properties.a.types.string?.stringOptions?.a).to.equal(1);
        expect(combinedSchema[0].properties.a.types.string?.stringOptions?.b).to.equal(2);
        expect(combinedSchema[0].properties.a.types.string?.stringOptions?.c).to.equal(3);

        expect(combinedSchema[0].properties).to.have.property("b");
        expect(combinedSchema[0].properties.b.types.string?.stringMaxLength).equal(20);
        expect(combinedSchema[0].properties.b.types.string?.stringMinLength).equal(10);
        expect(combinedSchema[0].properties.b.types.string?.stringOptions?.x).to.equal(1);
        expect(combinedSchema[0].properties.b.types.string?.stringOptions?.y).to.equal(2);
        expect(combinedSchema[0].properties.b.types.string?.stringOptions?.z).to.equal(3);
    });
});
