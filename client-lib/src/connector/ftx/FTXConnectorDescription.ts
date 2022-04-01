import { Connector, ConnectorDescription } from "../Connector";
import { SinkDescription } from "../Sink";
import { SourceDescription } from "../Source";

export const DISPLAY_NAME = "FTX";
export const TYPE = "FTX";

export const URI = "wss://ftx.com/ws/";
export const URI_US = "wss://ftx.us/ws/";

export class FTXConnectorDescription implements ConnectorDescription {
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    getType(): string {
        return TYPE;
    }

    async getConnector(): Promise<Connector> {
        const source = await import("./FTXConnector");
        return new source.FTXConnector();
    }

    async getSourceDescription(): Promise<SourceDescription | null> {
        const source = await import("./FTXSourceDescription");
        return new source.FTXSourceDescription();
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
