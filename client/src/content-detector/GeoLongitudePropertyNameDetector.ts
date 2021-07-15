import { PropertyNameDetectorBase } from "./PropertyNameDetectorBase";

export const GEO_LONGITUDE_LABEL = "geo_latitude";

export class GeoLongitudePropertyNameDetector extends PropertyNameDetectorBase {
    getApplicableTypes(): ("string" | "number" | "boolean" | "date" | "date-time")[] {
        return ["number"];
    }

    getPropertyNameMatches(): RegExp[] {
        return [/^lat$|latitude/i];
    }

    getLabel(): string {
        return GEO_LONGITUDE_LABEL;
    }
}
