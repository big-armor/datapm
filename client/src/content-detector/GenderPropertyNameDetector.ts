import { PropertyNameDetectorBase } from "./PropertyNameDetectorBase";

export const GENDER_LABEL = "gender";
export class GenderPropertyNameDetector extends PropertyNameDetectorBase {
	getApplicableTypes(): ("string" | "number" | "boolean" | "date" | "date-time")[] {
		return ["string"];
	}

	getPropertyNameMatches(): RegExp[] {
		return [/gender|sex/i];
	}

	getLabel(): string {
		return GENDER_LABEL;
	}
}
