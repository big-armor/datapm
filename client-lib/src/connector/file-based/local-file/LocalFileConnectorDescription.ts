import { Connector, ConnectorDescription } from "../../Connector";
import { SinkDescription } from "../../Sink";
import { SourceDescription } from "../../Source";
import { LocalFileSinkDescription } from "./LocalFileSinkDescription";
import { LocalFileSourceDescription } from "./LocalFileSourceDescription";

export const DISPLAY_NAME = "Local File";
export const TYPE = "file";

export class LocalFileConnectorDescription implements ConnectorDescription {
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    getType(): string {
        return TYPE;
    }

    async getConnector(): Promise<Connector> {
        const repository = await import("./LocalFileRepository");
        return new repository.LocalFileRepository();
    }

    async getSourceDescription(): Promise<SourceDescription | null> {
        return new LocalFileSourceDescription();
    }

    async getSinkDescription(): Promise<SinkDescription | null> {
        return new LocalFileSinkDescription();
    }

    hasSource(): boolean {
        return true;
    }

    hasSink(): boolean {
        return true;
    }
}
