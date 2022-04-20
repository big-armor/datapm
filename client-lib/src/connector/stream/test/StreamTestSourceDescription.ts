import { SourceDescription, Source } from "../../../connector/Source";
import { ConnectorConfigurationSet } from "../../../main";
import { TYPE, DISPLAY_NAME } from "./StreamTestConnectorDescription";

export class StreamTestSourceDescription implements SourceDescription {
    sourceType(): string {
        return TYPE;
    }

    /** The user friendly name of the source implementation */
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    supportsURI(uri: string): false | ConnectorConfigurationSet {
        if (uri.startsWith("test://")) {
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
        const module = await import("./StreamTestSource");
        return new module.StreamTestSource();
    }
}
