import { Connector, ConnectorDescription } from "../Connector";
import { SinkDescription } from "../Sink";
import { SourceDescription } from "../Source";

export const DISPLAY_NAME = "Binance";
export const TYPE = "binance";

export class BinanceConnectorDescription implements ConnectorDescription {
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    getType(): string {
        return TYPE;
    }

    async getConnector(): Promise<Connector> {
        const source = await import("./BinanceConnector");
        return new source.BinanceConnector();
    }

    async getSourceDescription(): Promise<SourceDescription | null> {
        const source = await import("./BinanceSourceDescription");
        return new source.BinanceSourceDescription();
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
