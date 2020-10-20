import { expect } from "chai";
import { hashPassword } from "./PasswordUtil";

describe("Passwordhasing", () => {
    it("THIS SHOULD NEVER CHANGE", () => {
        expect(hashPassword("abc12345", "mysalting")).equal("EPC2FzkvT3wmyml/ixDgb9G36NufR0IanKWysDWAsaw=");
    });
});
