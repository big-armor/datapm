import { expect } from "chai";
import { describe, it } from "mocha";
import { DeconflictOptions, resolveConflict } from "../src/util/SchemaUtil";

describe("SchemaUtil", function () {
    it("Should resolve integer double conflicts", function () {
        expect(resolveConflict("379.000000", DeconflictOptions.CAST_TO_DOUBLE).value).to.equal(379.0);
        expect(resolveConflict("379", DeconflictOptions.CAST_TO_DOUBLE).value).to.equal(379.0);
        expect(resolveConflict("1", DeconflictOptions.CAST_TO_DOUBLE).value).to.equal(1.0);
        expect(resolveConflict("0", DeconflictOptions.CAST_TO_DOUBLE).value).to.equal(0.0);
    });

    it("Should resolve date conflicts", function () {
        const date = new Date().toISOString();
        const deconflictedvalue = resolveConflict(date, DeconflictOptions.CAST_TO_DATE);
        const dateValue = deconflictedvalue.value as Date;
        expect(dateValue.toISOString()).to.equal(date);
    });

    it("Should deconflict string dates to dates", () => {
        const value = resolveConflict("2019-09-07T15:50:00.000Z", DeconflictOptions.CAST_TO_DATE_TIME);
        const dateValue = value.value as Date;
        expect(dateValue.toISOString()).to.equal("2019-09-07T15:50:00.000Z");
    });

    it("Should deconflict invalid string dates to null", () => {
        const value = resolveConflict("not a valid date", DeconflictOptions.CAST_TO_DATE_TIME);
        const dateValue = value.value as Date;

        expect(dateValue).to.equal(null);
    });

    it("Should deconflict string dates to dates", () => {
        const value = resolveConflict("2019-09-07", DeconflictOptions.CAST_TO_DATE);
        const dateValue = value.value as Date;

        expect(dateValue.toISOString()).to.equal("2019-09-07T00:00:00.000Z");
    });

    it("Should deconflict invalid string dates to null", () => {
        const value = resolveConflict("not a valid date", DeconflictOptions.CAST_TO_DATE);
        const dateValue = value.value as Date;

        expect(dateValue).to.equal(null);
    });
});
