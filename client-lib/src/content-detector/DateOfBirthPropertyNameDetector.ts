import { DPMPropertyTypes } from "datapm-lib";
import { PropertyNameDetectorBase } from "./PropertyNameDetectorBase";

export const DOB_LABEL = "birthdate";
export class DateOfBirthPropertyNameDetector extends PropertyNameDetectorBase {
    getApplicableTypes(): DPMPropertyTypes[] {
        return ["string", "date"];
    }

    getPropertyNameMatches(): RegExp[] {
        return [/dob|date[-_\s]?Of[-_\s]?birth|birth[-_\s]?(?:date|day)/i];
    }

    getLabel(): string {
        return DOB_LABEL;
    }
}
