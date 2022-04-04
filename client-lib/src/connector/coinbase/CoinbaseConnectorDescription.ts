import { Connector, ConnectorDescription } from "../Connector";
import { SinkDescription } from "../Sink";
import { SourceDescription } from "../Source";

export const DISPLAY_NAME = "Coinbase";
export const TYPE = "coinbase";

export const URI = "wss://ws-feed.exchange.coinbase.com";

export class CoinbaseConnectorDescription implements ConnectorDescription {
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    getType(): string {
        return TYPE;
    }

    async getConnector(): Promise<Connector> {
        const source = await import("./CoinbaseConnector");
        return new source.CoinbaseConnector();
    }

    async getSourceDescription(): Promise<SourceDescription | null> {
        const source = await import("./CoinbaseSourceDescription");
        return new source.CoinbaseSourceDescription();
    }

    async getSinkDescription(): Promise<SinkDescription | null> {
        return null;
    }

    hasSource(): boolean {
        return true;
    }

    hasSink(): boolean {
        return false;
    }
}
