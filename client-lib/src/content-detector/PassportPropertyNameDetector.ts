import { PropertyNameDetectorBase } from "./PropertyNameDetectorBase";

export const PASSPORT_LABEL = "passport";
export class PassportPropertyNameDetector extends PropertyNameDetectorBase {
    getApplicableTypes(): ("string" | "number" | "boolean" | "date" | "date-time")[] {
        return ["string", "number"];
    }

    getPropertyNameMatches(): RegExp[] {
        return [/pass[-_\s]?port/i];
    }

    getLabel(): string {
        return PASSPORT_LABEL;
    }
}
