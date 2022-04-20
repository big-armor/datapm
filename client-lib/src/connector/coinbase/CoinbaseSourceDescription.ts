import { Source, SourceDescription } from "../Source";
import { DISPLAY_NAME, TYPE, URI } from "./CoinbaseConnectorDescription";

export class CoinbaseSourceDescription implements SourceDescription {
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
        const source = await import("./CoinbaseSource");
        return new source.CoinbaseSource();
    }
}
