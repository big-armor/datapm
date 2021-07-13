import { RegexDetector } from "./RegexDetector";

export const PHONE_NUMBER_LABEL = "phone_number";

/** Applies the 'phone_number' label when any single phone number is found in any value */
export class PhoneNumberDetector extends RegexDetector {
	getApplicableTypes(): ("string" | "number")[] {
		return ["string", "number"];
	}

	getRegExp(): RegExp {
		return /\b(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})(?: *x(\d+))?\b/;
	}

	getLabel(): string {
		return PHONE_NUMBER_LABEL;
	}
}
