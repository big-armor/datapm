import { DPMPropertyTypes } from "datapm-lib";
import { PropertyNameDetectorBase } from "./PropertyNameDetectorBase";

export const GEO_LONGITUDE_LABEL = "geo_longitude";

export class GeoLongitudePropertyNameDetector extends PropertyNameDetectorBase {
    getApplicableTypes(): DPMPropertyTypes[] {
        return ["number"];
    }

    getPropertyNameMatches(): RegExp[] {
        return [/^long$|longitude/i];
    }

    getLabel(): string {
        return GEO_LONGITUDE_LABEL;
    }
}
