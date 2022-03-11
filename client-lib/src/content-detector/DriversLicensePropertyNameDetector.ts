import { PropertyNameDetectorBase } from "./PropertyNameDetectorBase";

export const DRIVERS_LICENSE_LABEL = "drivers_license";
export class DriversLicensePropertyNameDetector extends PropertyNameDetectorBase {
    getApplicableTypes(): ("string" | "number" | "boolean" | "date" | "date-time")[] {
        return ["string", "number"];
    }

    getPropertyNameMatches(): RegExp[] {
        return [/drivers?[-_\s]?license|^dl$/i];
    }

    getLabel(): string {
        return DRIVERS_LICENSE_LABEL;
    }
}
