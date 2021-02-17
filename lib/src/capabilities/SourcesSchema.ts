import { SourceDescription } from "./SourceDescription";

export interface SourcesSchema {
    version: string;
    sources: SourceDescription[];
}
