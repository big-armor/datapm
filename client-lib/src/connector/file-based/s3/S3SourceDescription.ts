import { SourceDescription, Source } from "../../../connector/Source";
import { ConnectorConfigurationSet } from "../../../main";
import { TYPE, DISPLAY_NAME } from "./S3ConnectorDescription";
export class S3SourceDescription implements SourceDescription {
    sourceType(): string {
        return TYPE;
    }

    /** The user friendly name of the source implementation */
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    supportsURI(uri: string): false | ConnectorConfigurationSet {
        if (uri.startsWith("s3://")) {
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
        const module = await import("./S3Source");
        return new module.S3Source();
    }
}
