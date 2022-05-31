import { expect } from "chai";
import moment from "moment";
import { test } from "mocha";
import { convertValueByValueType, discoverValueType, discoverValueTypeFromString } from "../src/util/SchemaUtil";

describe("String value type checks", () => {
    test("string detect integer", () => {
        expect(discoverValueTypeFromString("-324234234")).equal("integer");
        expect(discoverValueTypeFromString("234234234")).equal("integer");
        expect(discoverValueTypeFromString("1")).equal("integer");
        expect(discoverValueTypeFromString("0")).equal("integer");
    });

    test("strings that start with zero longer than a single character are strings, not numbers", () => {
        expect(discoverValueTypeFromString("01")).equal("string");
    });

    test("string detect doubles", () => {
        expect(discoverValueTypeFromString("-7.32")).equal("number");
        expect(discoverValueTypeFromString("7987.3907792")).equal("number");
    });
    test("string detect booleans correctly", () => {
        expect(discoverValueTypeFromString("tRuE")).equal("boolean");
        expect(discoverValueTypeFromString("FalSE")).equal("boolean");

        expect(discoverValueTypeFromString("Yes")).equal("boolean");
        expect(discoverValueTypeFromString("No")).equal("boolean");
    });

    test("string detect date", () => {
        expect(discoverValueTypeFromString(moment().format("YYYY-MM-DD"))).equal("date");
        expect(discoverValueTypeFromString(moment().format("YYYY-MM-DD"))).equal("date");
        expect(discoverValueTypeFromString(moment().format("YYYY-MM-DDThh:mmZZ"))).equal("date-time");
        expect(discoverValueTypeFromString(moment().format("YYYY-MM-DDThh:mmZZ"))).equal("date-time");
        expect(discoverValueTypeFromString(moment().format("YYYY-MM-DDThh:mm:ssZZ"))).equal("date-time");
        expect(discoverValueTypeFromString(moment().format("YYYY-MM-DDThh:mm:ssZZ"))).equal("date-time");
        expect(discoverValueTypeFromString(new Date().toISOString())).equal("date-time");
        expect(discoverValueTypeFromString(new Date().toISOString())).equal("date-time");
    });
    test("null check", () => {
        expect(discoverValueTypeFromString("null")).equal("null");
    });
});

describe("detect type check", function () {
    test("null", () => {
        expect(discoverValueType(null)).equal("null");
    });
    test("string", () => {
        expect(discoverValueType("test string")).equal("string");
    });
    test("bigint", () => {
        expect(discoverValueType(BigInt(100))).equal("integer");
    });
    test("float", () => {
        expect(discoverValueType(1.2)).equal("number");
    });
    test("integer", () => {
        expect(discoverValueType(100)).equal("integer");
    });
    test("boolean", () => {
        expect(discoverValueType(true)).equal("boolean");
    });
    test("object", () => {
        expect(discoverValueType({ luke: "darkside" })).equal("object");
    });
    test("array", () => {
        expect(discoverValueType([1, 2, 3])).equal("array");
    });
    test("number", () => {
        expect(discoverValueType("1.2")).equal("string");

        expect(discoverValueType("1.0")).equal("string");

        expect(discoverValueType(1.0)).equal("integer");

        expect(discoverValueType(1.2)).equal("number");
    });
});

describe("convert value by type", function () {
    test("string-string", () => {
        expect(convertValueByValueType("I am a string", "string")).equal("I am a string");
    });
    test("string-number", () => {
        expect(convertValueByValueType("-234.234", "number")).equal(-234.234);
        expect(convertValueByValueType("001234", "number")).equal(1234);
    });
    test("string-boolean", () => {
        expect(convertValueByValueType("no", "boolean")).equal(false);
        expect(convertValueByValueType("yes", "boolean")).equal(true);
    });
    test("string-null", () => {
        expect(convertValueByValueType("null", "null")).equal(null);
    });
    test("string-date", () => {
        const date = new Date();
        expect((convertValueByValueType(date.toISOString(), "date") as Date).toISOString()).equal(date.toISOString());
    });

    test("number-string", () => {
        expect(convertValueByValueType(1, "string")).equal("1");
    });
    test("number-boolean", () => {
        expect(convertValueByValueType(12, "boolean")).equal(true);
        expect(convertValueByValueType(0, "boolean")).equal(false);
        expect(convertValueByValueType(-1230, "boolean")).equal(false);
    });

    test("number/string-boolean", () => {
        expect(convertValueByValueType("12", "boolean")).equal(true);
        expect(convertValueByValueType("0", "boolean")).equal(false);
        expect(convertValueByValueType("-1230", "boolean")).equal(false);
    });

    test("string-boolean", () => {
        expect(convertValueByValueType("yes", "boolean")).equal(true);
        expect(convertValueByValueType("true", "boolean")).equal(true);
        expect(convertValueByValueType("false", "boolean")).equal(false);
        expect(convertValueByValueType("no", "boolean")).equal(false);
    });
});
