import { PropertyNameDetectorBase } from "./PropertyNameDetectorBase";

export const USERNAME_LABEL = "username";
export class UsernamePropertyNameDetector extends PropertyNameDetectorBase {
	getApplicableTypes(): ("string" | "number" | "boolean" | "date" | "date-time")[] {
		return ["string"];
	}

	getPropertyNameMatches(): RegExp[] {
		return [/user(?:[-_\s]name)?/i];
	}

	getLabel(): string {
		return USERNAME_LABEL;
	}
}
