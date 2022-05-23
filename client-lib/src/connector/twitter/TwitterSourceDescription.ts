import { ConnectorConfigurationSet, Source, SourceDescription } from "../Source";
import { DISPLAY_NAME, TYPE } from "./TwitterConnectorDescription";

export class TwitterSourceDescription implements SourceDescription {
    sourceType(): string {
        return TYPE;
    }

    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    supportsURI(uri: string): false | ConnectorConfigurationSet {
        return false; // TODO support importing people's feeds, etc
    }

    async getSource(): Promise<Source> {
        const source = await import("./TwitterSource");
        return new source.TwitterSource();
    }
}
