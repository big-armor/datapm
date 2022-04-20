import { SourceDescription, Source, ConnectorConfigurationSet } from "../../Source";
import { TYPE, DISPLAY_NAME } from "./BigQueryConnectorDescription";

export class BigQuerySourceDescription implements SourceDescription {
    sourceType(): string {
        return TYPE;
    }

    /** The user friendly name of the source implementation */
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    supportsURI(uri: string): false | ConnectorConfigurationSet {
        if (uri.startsWith("bigQuery://")) {
            return {
                connectionConfiguration: {},
                credentialsConfiguration: {},
                configuration: {
                    uris: [uri]
                }
            };
        }
        return false;
    }

    async getSource(): Promise<Source> {
        const module = await import("./BigQuerySource");
        return new module.BigQuerySource();
    }
}
