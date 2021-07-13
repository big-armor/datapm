import { PropertyNameDetectorBase } from "./PropertyNameDetectorBase";

export const NPI_LABEL = "national_provider_id";
export class NPIPropertyNameDetector extends PropertyNameDetectorBase {
	getApplicableTypes(): ("string" | "number" | "boolean" | "date" | "date-time")[] {
		return ["string", "number"];
	}

	getPropertyNameMatches(): RegExp[] {
		return [/^npi$|national[-_\s]?provider[-_\s]?id/i];
	}

	getLabel(): string {
		return NPI_LABEL;
	}
}
