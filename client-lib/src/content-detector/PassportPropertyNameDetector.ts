import { DPMPropertyTypes } from "datapm-lib";
import { PropertyNameDetectorBase } from "./PropertyNameDetectorBase";

export const PASSPORT_LABEL = "passport";
export class PassportPropertyNameDetector extends PropertyNameDetectorBase {
    getApplicableTypes(): DPMPropertyTypes[] {
        return ["string", "integer"];
    }

    getPropertyNameMatches(): RegExp[] {
        return [/pass[-_\s]?port/i];
    }

    getLabel(): string {
        return PASSPORT_LABEL;
    }
}
