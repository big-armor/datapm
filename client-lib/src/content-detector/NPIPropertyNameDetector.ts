import { DPMPropertyTypes } from "datapm-lib";
import { PropertyNameDetectorBase } from "./PropertyNameDetectorBase";

export const NPI_LABEL = "national_provider_id";
export class NPIPropertyNameDetector extends PropertyNameDetectorBase {
    getApplicableTypes(): DPMPropertyTypes[] {
        return ["string", "integer"];
    }

    getPropertyNameMatches(): RegExp[] {
        return [/^npi$|national[-_\s]?provider[-_\s]?id/i];
    }

    getLabel(): string {
        return NPI_LABEL;
    }
}
