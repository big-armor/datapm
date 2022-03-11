import { PropertyNameDetectorBase } from "./PropertyNameDetectorBase";

export const ETHNICITY_LABEL = "ethnicity";
export class EthnicityPropertyNameDetector extends PropertyNameDetectorBase {
    getApplicableTypes(): ("string" | "number" | "boolean" | "date" | "date-time")[] {
        return ["string"];
    }

    getPropertyNameMatches(): RegExp[] {
        return [/ethnicity|race/i];
    }

    getLabel(): string {
        return ETHNICITY_LABEL;
    }
}
