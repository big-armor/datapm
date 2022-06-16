import { ConnectorConfigurationSet, Source, SourceDescription } from "../Source";
import { DISPLAY_NAME, TYPE } from "./EventSourceConnectorDescription";

export class EventSourceSourceDescription implements SourceDescription {
    sourceType(): string {
        return TYPE;
    }

    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    supportsURI(uri: string): false | ConnectorConfigurationSet {
        return false;
    }

    async getSource(): Promise<Source> {
        const descriptionClass = await import("./EventSourceSource");
        return new descriptionClass.EventSourceSource();
    }
}
