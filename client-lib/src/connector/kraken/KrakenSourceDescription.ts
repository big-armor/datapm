import { Source, SourceDescription } from "../Source";
import { DISPLAY_NAME, TYPE } from "./KrakenConnectorDescription";

export const URI = "wss://ws.kraken.com";

export class KrakenSourceDescription implements SourceDescription {
    sourceType(): string {
        return TYPE;
    }

    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    supportsURI(uri: string): boolean {
        return uri.startsWith(URI);
    }

    async getSource(): Promise<Source> {
        const source = await import("./KrakenSource");
        return new source.KrakenSource();
    }
}
