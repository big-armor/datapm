import { expect } from "chai";
import { Schema } from "../src/main";
import { packageFileSchemaToAvroSchema } from "../src/AvroUtil";

describe("Avro Util", () => {
    it("Avro base62 name", () => {
        const property: Schema = {
            title: "tester?",
            properties: {
                "TestTitleWithExclamation!": {
                    title: "TestTitleWithExclamation!",
                    type: ["string", "number"]
                }
            }
        };

        const avroSchema = packageFileSchemaToAvroSchema(property);

        expect(avroSchema.name).equal("tester?");
        expect(avroSchema.fields[0].name).equal("3l6PC1HTiWR5Do5vbwfE9YnaHbOcmP9R7x_string");
    });

    it("Avro package file number format to double", () => {
        const property: Schema = {
            title: "numberTest",
            properties: {
                number: {
                    title: "number",
                    type: ["number"],
                    format: "integer,number" // These are the only two acceptable format values for a datapm packagefile
                }
            }
        };

        const avroSchema = packageFileSchemaToAvroSchema(property);

        expect(avroSchema.name).equal("numberTest");
        expect(avroSchema.fields[0].name).equal("YUCnH7eU_integer");
        expect(avroSchema.fields[0].type).equal("int");
        expect(avroSchema.fields[1].name).equal("YUCnH7eU_number");
        expect(avroSchema.fields[1].type).equal("double");
    });
});
