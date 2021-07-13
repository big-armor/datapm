import { RegexDetector } from "./RegexDetector";

export const EMAIL_ADDRESS_LABEL = "email_address";

/** Applies the 'phone_number' label when any single phone number is found in any value */
export class EmailAddressDetector extends RegexDetector {
	getRegExp(): RegExp {
		return /\S+@\S+\.\S{1,10}/;
	}

	getLabel(): string {
		return EMAIL_ADDRESS_LABEL;
	}
}
