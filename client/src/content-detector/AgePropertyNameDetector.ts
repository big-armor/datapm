import { PropertyNameDetectorBase } from "./PropertyNameDetectorBase";

export const AGE_LABEL = "age";
export class AgePropertyNameDetector extends PropertyNameDetectorBase {
    getApplicableTypes(): ("string" | "number" | "boolean" | "date" | "date-time")[] {
        return ["number"];
    }

    getPropertyNameMatches(): RegExp[] {
        return [/^age$/i];
    }

    getLabel(): string {
        return AGE_LABEL;
    }
}
