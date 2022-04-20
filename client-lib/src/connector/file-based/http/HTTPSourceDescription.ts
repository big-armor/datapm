import { SourceDescription, Source } from "../../../connector/Source";
import { ConnectorConfigurationSet } from "../../../main";
import { TYPE, DISPLAY_NAME } from "./HTTPConnectorDescription";
export class HTTPSourceDescription implements SourceDescription {
    sourceType(): string {
        return TYPE;
    }

    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    supportsURI(uri: string): false | ConnectorConfigurationSet {
        if (uri.startsWith("http://") || uri.startsWith("https://")) {
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
        const module = await import("./HTTPSource");
        return new module.HTTPSource();
    }
}
