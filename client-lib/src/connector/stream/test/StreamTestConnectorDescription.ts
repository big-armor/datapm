import { Connector, ConnectorDescription } from "../../Connector";
import { SinkDescription } from "../../Sink";
import { SourceDescription } from "../../Source";

export const DISPLAY_NAME = "Stream Test";
export const TYPE = "test";

export class StreamTestConnectorDescription implements ConnectorDescription {
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    getType(): string {
        return TYPE;
    }

    async getConnector(): Promise<Connector> {
        const source = await import("./StreamTestConnector");
        return new source.StreamTestConnector();
    }

    async getSourceDescription(): Promise<SourceDescription | null> {
        const source = await import("./StreamTestSourceDescription");
        return new source.StreamTestSourceDescription();
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
