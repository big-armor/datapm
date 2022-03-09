import { expect } from "chai";
import { test } from "mocha";
import { nameToSlug } from "../src/NameUtil";

describe("Check package suggestion name", () => {
    test("Package name tests", () => {
        expect(nameToSlug("US Federal Websites")).equal("us-federal-websites");

        expect(nameToSlug('"-us---------')).equal("us");

        expect(
            nameToSlug(
                "!@#$%^&*_-@#$@#1_2-3!@#$%^&*()-=4567890abcdefghijklmnopqrstuvwxyz~!@#$%^&*()_+-={}|:\"<>?[];',./`'"
            )
        ).equal("1_2-3-4567890abcdefghijklmnopqrstuvwxy");

        expect(nameToSlug("This is a very long name that should be much shorter after normalizing")).equal(
            "this-is-a-very-long-name-that-should-b"
        );
        expect(
            nameToSlug(
                "-_-This is a very long name that has dashes at the front that should not be included in the final character count"
            ).length
        ).equal(38);
    });
});
