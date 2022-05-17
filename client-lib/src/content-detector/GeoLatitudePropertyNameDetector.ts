import { DPMPropertyTypes } from "datapm-lib";
import { PropertyNameDetectorBase } from "./PropertyNameDetectorBase";

export const GEO_LATITUDE_LABEL = "geo_latitude";

export class GeoLatitudePropertyNameDetector extends PropertyNameDetectorBase {
    getApplicableTypes(): DPMPropertyTypes[] {
        return ["number"];
    }

    getPropertyNameMatches(): RegExp[] {
        return [/^lat$|latitude/i];
    }

    getLabel(): string {
        return GEO_LATITUDE_LABEL;
    }
}
