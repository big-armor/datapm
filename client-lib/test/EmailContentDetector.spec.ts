import { expect } from "chai";
import { EmailAddressDetector, EMAIL_ADDRESS_LABEL } from "../src/content-detector/EmailContentDetector";

describe("Check email formats", () => {
    let emailContentDetector: EmailAddressDetector;

    before(() => {
        emailContentDetector = new EmailAddressDetector();
    });
    it("should recognize common email address formats", () => {
        emailContentDetector.inspectValue("test@test.com");
        expect(emailContentDetector.getValueTestCount()).equal(1);

        emailContentDetector.inspectValue("test@notvalid");
        expect(emailContentDetector.getValueTestCount()).equal(2);

        emailContentDetector.inspectValue("test+test2@valid.domain");
        expect(emailContentDetector.getValueTestCount()).equal(3);

        emailContentDetector.inspectValue("test+test2valid.domain");
        expect(emailContentDetector.getValueTestCount()).equal(4);
    });

    it("should always return a label when there are one or more emails present", () => {
        emailContentDetector.inspectValue("not an email");
        expect(emailContentDetector.getValueTestCount()).equal(5);

        let labels = emailContentDetector.getContentLabels("test");

        expect(labels.length).equal(1);

        emailContentDetector.inspectValue("There is an email burried test@test.com deep in this value.");
        expect(emailContentDetector.getValueTestCount()).equal(6);

        labels = emailContentDetector.getContentLabels("test");
        expect(labels.length).equal(1);
        expect(labels[0].label).equal(EMAIL_ADDRESS_LABEL);
        expect(labels[0].appliedByContentDetector).equal(EmailAddressDetector.name);
        expect(labels[0].ocurrenceCount).equal(3);
    });
});
