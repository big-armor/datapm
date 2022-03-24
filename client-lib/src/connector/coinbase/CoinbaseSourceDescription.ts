import { Source, SourceDescription } from "../Source";
import { DISPLAY_NAME, TYPE } from "./CoinbaseConnectorDescription";

export const URI = "wss://ws-feed.exchange.coinbase.com";

export class CoinbaseSourceDescription implements SourceDescription {
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
        const source = await import("./CoinbaseSource");
        return new source.CoinbaseSource();
    }
}
