import { Connector, ConnectorDescription } from "../../Connector";
import { SinkDescription } from "../../Sink";
import { SourceDescription } from "../../Source";

export const TYPE = "googlesheet";
export const DISPLAY_NAME = "Google Sheets";

export class GoogleSheetConnectorDescription implements ConnectorDescription {
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    getType(): string {
        return TYPE;
    }

    async getConnector(): Promise<Connector> {
        const module = await import("./GoogleSheetRepository");
        return new module.GoogleSheetRepository();
    }

    async getSourceDescription(): Promise<SourceDescription | null> {
        const module = await import("./GoogleSheetSourceDescription");
        return new module.GoogleSheetSourceDescription();
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
