import { Source, SourceDescription } from "../Source";
import { URI } from "./KrakenConnector";
import { DISPLAY_NAME, TYPE } from "./KrakenConnectorDescription";

export class KrakenSourceDescription implements SourceDescription {
    sourceType(): string {
        return TYPE;
    }

    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    supportsURI(uri: string): false {
        return false;
    }

    async getSource(): Promise<Source> {
        const source = await import("./KrakenSource");
        return new source.KrakenSource();
    }
}
