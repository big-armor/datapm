import { Connector, ConnectorDescription } from "../../Connector";
import { SinkDescription } from "../../Sink";
import { SourceDescription } from "../../Source";

export const DISPLAY_NAME = "Redshift";
export const TYPE = "redshift";

export class RedshiftConnectorDescription implements ConnectorDescription {
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    getType(): string {
        return TYPE;
    }

    async getConnector(): Promise<Connector> {
        const repository = await import("./RedshiftRepository");
        return new repository.RedshiftRepository();
    }

    async getSourceDescription(): Promise<SourceDescription | null> {
        const repository = await import("./RedshiftSourceDescription");
        return new repository.RedshiftSourceDescription();
    }

    async getSinkDescription(): Promise<SinkDescription | null> {
        const repository = await import("./RedshiftSinkDescription");
        return new repository.RedshiftSinkDescription();
    }

    hasSource(): boolean {
        return true;
    }

    hasSink(): boolean {
        return true;
    }
}
