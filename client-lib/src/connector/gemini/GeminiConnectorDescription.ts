import { Connector, ConnectorDescription } from "../Connector";
import { SinkDescription } from "../Sink";
import { SourceDescription } from "../Source";

export const DISPLAY_NAME = "Gemini";
export const TYPE = "gemini";

export const URI_BASE = "wss://api.gemini.com/v1/marketdata/";

export class GeminiConnectorDescription implements ConnectorDescription {
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    getType(): string {
        return TYPE;
    }

    async getConnector(): Promise<Connector> {
        const source = await import("./GeminiConnector");
        return new source.GeminiConnector();
    }

    async getSourceDescription(): Promise<SourceDescription | null> {
        const source = await import("./GeminiSourceDescription");
        return new source.GeminiSourceDescription();
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
