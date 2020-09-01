
import { SemVer } from 'semver';
import { hashPassword } from '../src/util/PasswordUtil';
/// <reference types="jest" />

describe("Passwordhasing", () => {
    test("THIS SHOULD NEVER CHANGE", () => {
        expect(hashPassword('abc12345','mysalting')).toEqual('EPC2FzkvT3wmyml/ixDgb9G36NufR0IanKWysDWAsaw=');
    });
});