import { expect } from "chai";
import moment from "moment";
import { isDate, isDateTime } from "../src/util/DateUtil";

describe("Check package suggestion name", () => {
    it("Should detect dates", () => {
        expect(isDate("2020-01-12")).equal(true);
        expect(isDate("2020/01/12")).equal(true);
        expect(isDate("2020.01.12")).equal(true);
        expect(isDate("12.01.2020")).equal(true);
        expect(isDate("01.01.1990")).equal(true);
        expect(isDate("1.01.1990")).equal(true);

        expect(isDate("2020\\01\\12")).equal(false);
    });

    it("Should detect various dates and times", () => {
        expect(isDateTime("Tue, 30 Aug 2016 03:01:19 GMT")).to.equal(true);
        expect(isDateTime("Tue Aug 30 2016 11:02:45 GMT+0800")).to.equal(true);
        expect(isDateTime("2016-08-30T03:01:19.543Z")).to.equal(true);
        expect(isDateTime("Tue Aug 30 2016")).to.equal(false);
        expect(isDateTime(moment().format("YYYY-MM-DDThh:mmZZ"))).to.equal(true);
        expect(isDateTime(moment().format("YYYY-MM-DDThh:mm:ssZZ"))).to.equal(true);
        expect(isDate("Tue Aug 30 2016")).to.equal(true);
        expect(isDate("2015-02-09 01:54:02")).equal(false);
        expect(isDateTime("2015-02-09 01:54:02")).equal(true);
        expect(isDate("2/1/2020 11:53")).equal(false);
        expect(isDateTime("2/1/2020 11:53")).equal(true);
        expect(isDate("2020/2/1 11:53")).equal(false);
        expect(isDateTime("2020/2/1 11:53")).equal(true);
        expect(isDateTime("2/1/2020 1:52")).equal(true);
        expect(isDateTime("2022-05-06T20:57:01.873850Z")).equal(true);
    });

    it("Should not find dates deep in strings", () => {
        expect(isDateTime("Not a date Tue, 30 Aug 2016 03:01:19 GMT")).equal(false);
        expect(isDateTime("Not a date Tue Aug 30 2016 11:02:45 GMT+0800")).equal(false);
        expect(isDateTime("Not a date 2016-08-30T03:01:19.543Z")).equal(false);
        expect(isDateTime("Not a date Tue Aug 30 2016")).equal(false);
    });

    it("Should detect with leading adn trailing spaces", () => {
        expect(isDateTime("  Tue, 30 Aug 2016 03:01:19 GMT")).to.equal(true);
        expect(isDateTime("  Tue Aug 30 2016 11:02:45 GMT+0800   ")).to.equal(true);
        expect(isDateTime("  2016-08-30T03:01:19.543Z")).to.equal(true);
        expect(isDateTime("  Tue Aug 30 2016")).to.equal(false);
        expect(isDate("  Tue Aug 30 2016")).to.equal(true);
    });

    it("Should support Big Query Date Format", () => {
        expect(isDate("2020-02-24 18:00:00 UTC")).equal(false);
        expect(isDateTime("2020-02-24 18:00:00 UTC")).equal(true);
    });

    it("Should support", () => {
        expect(isDate("05/05/2020 05:25:08 PM")).equal(false);
        expect(isDateTime("05/05/2020 05:25:08 PM")).equal(true);
    });
});
