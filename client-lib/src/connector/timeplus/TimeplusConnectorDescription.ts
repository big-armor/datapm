import { Connector, ConnectorDescription } from "../Connector";
import { SinkDescription } from "../Sink";
import { SourceDescription } from "../Source";

export const DISPLAY_NAME = "Timeplus";
export const TYPE = "Timeplus";

export class TimeplusConnectorDescription implements ConnectorDescription {
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    getType(): string {
        return TYPE;
    }

    async getConnector(): Promise<Connector> {
        const source = await import("./TimeplusConnector");
        return new source.TimeplusConnector();
    }

    async getSourceDescription(): Promise<SourceDescription | null> {
        return null;
    }

    async getSinkDescription(): Promise<SinkDescription | null> {
        const source = await import("./TimeplusSinkDescription");
        return new source.TimeplusSinkDescription();
    }

    hasSource(): boolean {
        return false;
    }

    hasSink(): boolean {
        return true;
    }
}
