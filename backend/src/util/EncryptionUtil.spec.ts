import { expect } from "chai";
import { randomUUID } from "crypto";
import { describe, it } from "mocha";
import { decryptValue, encryptValue } from "./EncryptionUtil";

describe("Encryption Utils", () => {
    it("Should encrypt/decrypt values", () => {
        const value = randomUUID();

        process.env.NODEJS_ENCRYPTION_KEY = randomUUID();

        const encryptedValue = encryptValue(value);

        const decryptedValue = decryptValue(encryptedValue);

        expect(value).equal(decryptedValue);
    });
});
