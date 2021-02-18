import { Injectable } from "@angular/core";
import { SourceDescription } from "datapm-lib/src/capabilities/SourceDescription";
import { SourcesSchema } from "datapm-lib/src/capabilities/SourcesSchema";
import { CapabilitiesService } from "datapm-lib/src/capabilities/CapabilitiesService";

import * as capabilitiesModule from "datapm-lib/sources.json";

@Injectable({
    providedIn: "root"
})
export class CapabilitiesServiceImpl implements CapabilitiesService {
    private readonly schema = capabilitiesModule.default as SourcesSchema;
    private readonly sources: SourceDescription[] = this.schema.sources;

    public getSourceDescriptions(): SourceDescription[] {
        return this.sources;
    }
}
