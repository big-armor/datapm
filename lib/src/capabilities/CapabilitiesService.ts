import { SourceDescription } from "./SourceDescription";

export interface CapabilitiesService {
    getSourceDescriptions(): SourceDescription[];
}
