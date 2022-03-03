import { Connector, ConnectorDescription } from "../../Connector";
import { SinkDescription } from "../../Sink";
import { SourceDescription } from "../../Source";

export const DISPLAY_NAME = "DataPM Registry";
export const TYPE = "datapm";

export class DataPMConnectorDescription implements ConnectorDescription {
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    getType(): string {
        return TYPE;
    }

    async getRepository(): Promise<Connector> {
        const repository = await import("./DataPMRepository");
        return new repository.DataPMRepository();
    }

    async getSourceDescription(): Promise<SourceDescription | null> {
        const repository = await import("./DataPMSourceDescription");
        return new repository.DataPMSourceDescription();
    }

    async getSinkDescription(): Promise<SinkDescription | null> {
        const repository = await import("./DataPMSinkDescription");
        return new repository.DataPMSinkDescription();
    }

    hasSource(): boolean {
        return false;
    }

    hasSink(): boolean {
        return true;
    }
}
