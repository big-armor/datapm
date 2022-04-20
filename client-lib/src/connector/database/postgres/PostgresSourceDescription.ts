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
        if (uri.startsWith("postgres://")) {
            return {
                connectionConfiguration: {},
                credentialsConfiguration: {},
                configuration: {}
            };
        }
        return false;
    }

    async getSource(): Promise<Source> {
        const module = await import("./PostgresSource");
        return new module.PostgresSource();
    }
}
