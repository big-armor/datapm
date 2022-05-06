import { DPMPropertyTypes } from "datapm-lib";
import { PropertyNameDetectorBase } from "./PropertyNameDetectorBase";

export const GENDER_LABEL = "gender";
export class GenderPropertyNameDetector extends PropertyNameDetectorBase {
    getApplicableTypes(): DPMPropertyTypes[] {
        return ["string"];
    }

    getPropertyNameMatches(): RegExp[] {
        return [/gender|sex/i];
    }

    getLabel(): string {
        return GENDER_LABEL;
    }
}
