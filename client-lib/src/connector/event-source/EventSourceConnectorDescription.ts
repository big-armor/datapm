import { Connector, ConnectorDescription } from "../Connector";
import { SinkDescription } from "../Sink";
import { SourceDescription } from "../Source";

export const TYPE = "eventSource";
export const DISPLAY_NAME = "Event Source";

export class EventSourceConnectorDescription implements ConnectorDescription {
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    getType(): string {
        return TYPE;
    }

    async getConnector(): Promise<Connector> {
        const connectorClass = await import("./EventSourceConnector");
        return new connectorClass.EventSourceConector();
    }

    async getSourceDescription(): Promise<SourceDescription | null> {
        const descriptionClass = await import("./EventSourceSourceDescription");
        return new descriptionClass.EventSourceSourceDescription();
    }

    getSinkDescription(): Promise<SinkDescription | null> {
        throw new Error("Method not implemented.");
    }

    hasSource(): boolean {
        return true;
    }

    hasSink(): boolean {
        return false;
    }
}
