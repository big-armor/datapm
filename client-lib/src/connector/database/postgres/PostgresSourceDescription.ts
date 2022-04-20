import { SourceDescription, Source, ConnectorConfigurationSet } from "../../Source";
import { TYPE, DISPLAY_NAME } from "./PostgresConnectorDescription";

export class PostgresSourceDescription implements SourceDescription {
    sourceType(): string {
        return TYPE;
    }

    /** The user friendly name of the source implementation */
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    supportsURI(uri: string): false | ConnectorConfigurationSet {
        // TODO Implement Postgres URI parsing
        return false;
    }

    async getSource(): Promise<Source> {
        const module = await import("./PostgresSource");
        return new module.PostgresSource();
    }
}
