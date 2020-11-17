import { SchemaPropertiesPipe } from "./schema-properties.pipe";

describe("SchemaPropertiesPipe", () => {
    it("create an instance", () => {
        const pipe = new SchemaPropertiesPipe();
        expect(pipe).toBeTruthy();
    });
});
