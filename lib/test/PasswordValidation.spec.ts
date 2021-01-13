import { expect } from "chai";
import { passwordValid } from "../src/main";

describe("Checking VersionUtil", () => {
    it("Password validation", () => {
        expect(passwordValid(undefined)).equal("PASSWORD_REQUIRED");
        expect(passwordValid("")).equal("PASSWORD_REQUIRED");
        expect(passwordValid("abcdef")).equal("PASSWORD_TOO_SHORT");
        expect(passwordValid("a".repeat(100))).equal("PASSWORD_TOO_LONG");
        expect(passwordValid("abcdefgh")).equal("INVALID_CHARACTERS");
        expect(passwordValid("abcdefgh")).equal("INVALID_CHARACTERS");
        expect(passwordValid("abcdefg!")).equal(true);
    });
});
