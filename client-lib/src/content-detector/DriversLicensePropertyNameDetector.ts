import { DPMPropertyTypes } from "datapm-lib";
import { PropertyNameDetectorBase } from "./PropertyNameDetectorBase";

export const DRIVERS_LICENSE_LABEL = "drivers_license";
export class DriversLicensePropertyNameDetector extends PropertyNameDetectorBase {
    getApplicableTypes(): DPMPropertyTypes[] {
        return ["string", "integer"];
    }

    getPropertyNameMatches(): RegExp[] {
        return [/drivers?[-_\s]?license|^dl$/i];
    }

    getLabel(): string {
        return DRIVERS_LICENSE_LABEL;
    }
}
