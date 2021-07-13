import { RegexDetector } from "./RegexDetector";

export const IP_V4_ADDRESS_LABEL = "ip_v4_address";

/** Applies the 'phone_number' label when any single phone number is found in any value */
export class IpV4AddressDetector extends RegexDetector {
	getRegExp(): RegExp {
		return /(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)/;
	}

	getLabel(): string {
		return IP_V4_ADDRESS_LABEL;
	}
}
