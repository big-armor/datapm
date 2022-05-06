import { DPMPropertyTypes } from "datapm-lib";
import { RegexDetector } from "./RegexDetector";

export const SOCIAL_SECURITY_NUMBER_LABEL = "social_security_number";

/** Applies the 'phone_number' label when any single phone number is found in any value */
export class SocialSecurityNumberDetector extends RegexDetector {
    getApplicableTypes(): DPMPropertyTypes[] {
        return ["string", "integer"];
    }

    getRegExp(): RegExp {
        return /\b(?!666|000|9\d{2})\d{3}-?(?!00)\d{2}-?(?!0{4})\d{4}\b/;
    }

    getLabel(): string {
        return SOCIAL_SECURITY_NUMBER_LABEL;
    }
}
