import { expect } from "chai";
import { describe, it } from "mocha";
import { DeconflictOptions, resolveConflict } from "../src/util/SchemaUtil";

describe("SchemaUtil", function () {
    it("Should resolve integer double conflicts", function () {
        expect(resolveConflict("379.000000", DeconflictOptions.CAST_TO_DOUBLE)).to.equal("379.000000");
        expect(resolveConflict("379", DeconflictOptions.CAST_TO_DOUBLE)).to.equal("379.0");
        expect(resolveConflict("1", DeconflictOptions.CAST_TO_DOUBLE)).to.equal("1.0");
        expect(resolveConflict("0", DeconflictOptions.CAST_TO_DOUBLE)).to.equal("0.0");
    });

    it("Should resolve date conflicts", function () {
        const date = new Date().toISOString();
        expect(resolveConflict(date, DeconflictOptions.CAST_TO_DATE)).to.equal(date);
    });
});
