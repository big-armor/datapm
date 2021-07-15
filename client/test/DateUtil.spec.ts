import { expect } from "chai";
import { isDate, isTime } from "../src/util/DateUtil";

describe("Check package suggestion name", () => {
    it("Should normalize YYYY-MM-DD", () => {
        expect(isDate("2020-01-12")).equal("2020-01-12");
        expect(isDate("2020/01/12")).equal("2020-01-12");
        expect(isDate("2020.01.12")).equal("2020-01-12");
        expect(isDate("2020\\01\\12")).equal("");
    });

    it("Should normalize ISO string", () => {
        expect(isDate("Tue, 30 Aug 2016 03:01:19 GMT")).equal("2016-08-29");
        expect(isDate("Tue Aug 30 2016 11:02:45 GMT+0800")).equal("2016-08-29"); // is this right?
        expect(isDate("2016-08-30T03:01:19.543Z")).equal("2016-08-30");
        expect(isDate("Tue Aug 30 2016")).equal("2016-08-30");
    });

    it("Should not find dates deep in strings", () => {
        expect(isDate("Not a date Tue, 30 Aug 2016 03:01:19 GMT")).equal("");
        expect(isDate("Not a date Tue Aug 30 2016 11:02:45 GMT+0800")).equal("");
        expect(isDate("Not a date 2016-08-30T03:01:19.543Z")).equal("");
        expect(isDate("Not a date Tue Aug 30 2016")).equal("");
    });

    it("Should normalize ISO string", () => {
        expect(isDate("  Tue, 30 Aug 2016 03:01:19 GMT")).equal("2016-08-29");
        expect(isDate("  Tue Aug 30 2016 11:02:45 GMT+0800")).equal("2016-08-29"); // is this right?
        expect(isDate("  2016-08-30T03:01:19.543Z")).equal("2016-08-30");
        expect(isDate("  Tue Aug 30 2016")).equal("2016-08-30");
    });

    it("Should support Big Query Date Format", () => {
        expect(isDate("2020-02-24 18:00:00 UTC")).equal("2020-02-24");
        expect(isTime("2020-02-24 18:00:00 UTC")).equal("18:00:00 UTC");
    });

    it("Should support", () => {
        expect(isDate("05/05/2020 05:25:08 PM")).equal("2020-05-05");
        expect(isTime("05/05/2020 05:25:08 PM")).equal("05:25:08 PM");
    });
});
