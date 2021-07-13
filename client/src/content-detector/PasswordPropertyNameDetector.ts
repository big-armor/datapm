import { PropertyNameDetectorBase } from "./PropertyNameDetectorBase";

export const SECRET_LABEL = "secret";
export class SecretPropertyNameDetector extends PropertyNameDetectorBase {
	getApplicableTypes(): ("string" | "number" | "boolean" | "date" | "date-time")[] {
		return ["string"];
	}

	getPropertyNameMatches(): RegExp[] {
		return [/^pass$|password|secret/i];
	}

	getLabel(): string {
		return SECRET_LABEL;
	}
}
