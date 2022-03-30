import { Connector, ConnectorDescription } from "../Connector";
import { SinkDescription } from "../Sink";
import { SourceDescription } from "../Source";

export const DISPLAY_NAME = "Kraken";
export const TYPE = "kraken";

export class KrakenConnectorDescription implements ConnectorDescription {
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    getType(): string {
        return TYPE;
    }

    async getConnector(): Promise<Connector> {
        const source = await import("./KrakenConnector");
        return new source.KrakenConnector();
    }

    async getSourceDescription(): Promise<SourceDescription | null> {
        const source = await import("./KrakenSourceDescription");
        return new source.KrakenSourceDescription();
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
