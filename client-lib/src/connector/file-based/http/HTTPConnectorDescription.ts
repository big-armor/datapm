import { Connector, ConnectorDescription } from "../../Connector";
import { SinkDescription } from "../../Sink";
import { SourceDescription } from "../../Source";

export const DISPLAY_NAME = "HTTP";
export const TYPE = "http";

export class HTTPConnectorDescription implements ConnectorDescription {
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    getType(): string {
        return TYPE;
    }

    hasSource(): boolean {
        return true;
    }

    hasSink(): boolean {
        return false;
    }

    async getConnector(): Promise<Connector> {
        const repository = await import("./HTTPRepository");
        return new repository.HTTPRepository();
    }

    async getSourceDescription(): Promise<SourceDescription | null> {
        const source = await import("./HTTPSourceDescription");
        return new source.HTTPSourceDescription();
    }

    async getSinkDescription(): Promise<SinkDescription | null> {
        return null;
    }
}
