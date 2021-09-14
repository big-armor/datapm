import { expect } from "chai";
import { decodeBase62, encodeBase62 } from "../src/Base62Util";

describe("Avro Util", () => {
    it("Base62 Test", () => {
        const initialValue = "a!@#%^(";
        const base62Value = encodeBase62(initialValue);
        const decodedValue = decodeBase62(base62Value);

        expect(initialValue).equal(decodedValue);
    });

    it("Base62 Test", () => {
        const initialValue = "a";
        const base62Value = encodeBase62(initialValue);
        expect(base62Value).equal("1Z");
    });
});
