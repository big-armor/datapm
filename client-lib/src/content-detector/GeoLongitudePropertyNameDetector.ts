import { DPMPropertyTypes } from "datapm-lib";
import { PropertyNameDetectorBase } from "./PropertyNameDetectorBase";

export const GEO_LONGITUDE_LABEL = "geo_latitude";

export class GeoLongitudePropertyNameDetector extends PropertyNameDetectorBase {
    getApplicableTypes(): DPMPropertyTypes[] {
        return ["number"];
    }

    getPropertyNameMatches(): RegExp[] {
        return [/^lat$|latitude/i];
    }

    getLabel(): string {
        return GEO_LONGITUDE_LABEL;
    }
}
