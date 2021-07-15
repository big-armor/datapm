import { expect } from "chai";
import moment from "moment";
import { test } from "mocha";
import {
    convertValueByValueType,
    discoverValueType,
    discoverValueTypeFromString
} from "../src/source/transforms/StatsTransform";

describe("String value type checks", () => {
    test("string detect number", () => {
        expect(discoverValueTypeFromString("0").type).equal("binary");
    });

    test("strings that start with zero longer than a single character are strings, not numbers", () => {
        expect(discoverValueTypeFromString("01").type).equal("string");
    });

    test("string detect floating point", () => {
        expect(discoverValueTypeFromString("-7.32").type).equal("number");
    });
    test("string detect boolean", () => {
        expect(discoverValueTypeFromString("tRuE").type).equal("boolean");
        expect(discoverValueTypeFromString("FalSE").type).equal("boolean");

        expect(discoverValueTypeFromString("Yes").type).equal("boolean");
        expect(discoverValueTypeFromString("No").type).equal("boolean");
    });

    test("string detect date", () => {
        expect(discoverValueTypeFromString(moment().format("YYYY-MM-DD")).type).equal("date");
        expect(discoverValueTypeFromString(moment().format("YYYY-MM-DD")).format).equal("date");
        expect(discoverValueTypeFromString(moment().format("YYYY-MM-DDThh:mmZZ")).type).equal("date");
        expect(discoverValueTypeFromString(moment().format("YYYY-MM-DDThh:mmZZ")).format).equal("date-time");
        expect(discoverValueTypeFromString(moment().format("YYYY-MM-DDThh:mm:ssZZ")).type).equal("date");
        expect(discoverValueTypeFromString(moment().format("YYYY-MM-DDThh:mm:ssZZ")).format).equal("date-time");
        expect(discoverValueTypeFromString(new Date().toISOString()).type).equal("date");
        expect(discoverValueTypeFromString(new Date().toISOString()).format).equal("date-time");
    });
    test("null check", () => {
        expect(discoverValueTypeFromString("null").type).equal("null");
    });
});

describe("detect type check", function () {
    test("null", () => {
        expect(discoverValueType(null).type).equal("null");
    });
    test("string", () => {
        expect(discoverValueType("test string").type).equal("string");
    });
    test("bigint", () => {
        expect(discoverValueType(BigInt(100)).type).equal("number");
    });
    test("float", () => {
        expect(discoverValueType(1.2).type).equal("number");
    });
    test("integer", () => {
        expect(discoverValueType(100).type).equal("number");
    });
    test("boolean", () => {
        expect(discoverValueType(true).type).equal("boolean");
    });
    test("object", () => {
        expect(discoverValueType({ luke: "darkside" }).type).equal("object");
    });
    test("array", () => {
        expect(discoverValueType([1, 2, 3]).type).equal("array");
    });
});

describe("convert value by type", function () {
    test("string-string", () => {
        expect(convertValueByValueType("I am a string", { type: "string" })).equal("I am a string");
    });
    test("string-number", () => {
        expect(convertValueByValueType("-234.234", { type: "number" })).equal(-234.234);
        expect(convertValueByValueType("001234", { type: "number" })).equal(1234);
    });
    test("string-boolean", () => {
        expect(convertValueByValueType("no", { type: "boolean" })).equal(false);
        expect(convertValueByValueType("yes", { type: "boolean" })).equal(true);
    });
    test("string-null", () => {
        expect(convertValueByValueType("null", { type: "null" })).equal(null);
    });
    test("string-date", () => {
        const date = new Date();
        expect((convertValueByValueType(date.toISOString(), { type: "date" }) as Date).toISOString()).equal(
            date.toISOString()
        );
    });

    test("number-string", () => {
        expect(convertValueByValueType(1, { type: "string" })).equal("1");
    });
    test("number-boolean", () => {
        expect(convertValueByValueType(12, { type: "boolean" })).equal(true);
        expect(convertValueByValueType(0, { type: "boolean" })).equal(false);
        expect(convertValueByValueType(-1230, { type: "boolean" })).equal(false);
    });

    test("number/string-boolean", () => {
        expect(convertValueByValueType("12", { type: "boolean" })).equal(true);
        expect(convertValueByValueType("0", { type: "boolean" })).equal(false);
        expect(convertValueByValueType("-1230", { type: "boolean" })).equal(false);
    });

    test("string-boolean", () => {
        expect(convertValueByValueType("yes", { type: "boolean" })).equal(true);
        expect(convertValueByValueType("true", { type: "boolean" })).equal(true);
        expect(convertValueByValueType("false", { type: "boolean" })).equal(false);
        expect(convertValueByValueType("no", { type: "boolean" })).equal(false);
    });
});
