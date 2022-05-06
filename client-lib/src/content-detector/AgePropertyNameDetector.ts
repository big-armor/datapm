import { DPMPropertyTypes } from "datapm-lib";
import { PropertyNameDetectorBase } from "./PropertyNameDetectorBase";

export const AGE_LABEL = "age";
export class AgePropertyNameDetector extends PropertyNameDetectorBase {
    getApplicableTypes(): DPMPropertyTypes[] {
        return ["integer"];
    }

    getPropertyNameMatches(): RegExp[] {
        return [/^age$/i];
    }

    getLabel(): string {
        return AGE_LABEL;
    }
}
