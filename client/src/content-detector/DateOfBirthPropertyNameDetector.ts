import { PropertyNameDetectorBase } from "./PropertyNameDetectorBase";

export const DOB_LABEL = "birthdate";
export class DateOfBirthPropertyNameDetector extends PropertyNameDetectorBase {
	getApplicableTypes(): ("string" | "number" | "boolean" | "date" | "date-time")[] {
		return ["string", "date"];
	}

	getPropertyNameMatches(): RegExp[] {
		return [/dob|date[-_\s]?Of[-_\s]?birth|birth[-_\s]?(?:date|day)/i];
	}

	getLabel(): string {
		return DOB_LABEL;
	}
}
