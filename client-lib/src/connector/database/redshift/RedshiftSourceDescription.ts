import { SourceDescription, Source } from "../../../connector/Source";
import { ConnectorConfigurationSet } from "../../../main";
import { TYPE, DISPLAY_NAME } from "./RedshiftConnectorDescription";

export class RedshiftSourceDescription implements SourceDescription {
    sourceType(): string {
        return TYPE;
    }

    /** The user friendly name of the source implementation */
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    supportsURI(uri: string): false | ConnectorConfigurationSet {
        if (uri.startsWith("redshift://")) {
            return {
                connectionConfiguration: {
                    uris: [uri]
                },
                credentialsConfiguration: {},
                configuration: {}
            };
        }
        return false;
    }

    async getSource(): Promise<Source> {
        const module = await import("./RedshiftSource");
        return new module.RedshiftSource();
    }
}
