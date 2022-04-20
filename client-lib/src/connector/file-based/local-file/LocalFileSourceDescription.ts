import globParent from "glob-parent";
import isGlob from "is-glob";
import { SourceDescription, Source } from "../../../connector/Source";
import fs from "fs";
import { TYPE, DISPLAY_NAME } from "./LocalFileConnectorDescription";
import { ConnectorConfigurationSet } from "../../../main";

export class LocalFileSourceDescription implements SourceDescription {
    sourceType(): string {
        return TYPE;
    }

    /** The user friendly name of the source implementation */
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    supportsURI(uri: string): false | ConnectorConfigurationSet {
        if (uri.startsWith("file://"))
            return {
                connectionConfiguration: {},
                credentialsConfiguration: {},
                configuration: {
                    uris: [uri]
                }
            };

        if (isGlob(uri) && fs.existsSync(globParent(uri))) {
            return {
                connectionConfiguration: {},
                credentialsConfiguration: {},
                configuration: {
                    uris: [uri]
                }
            };
        }

        if (fs.existsSync(uri)) {
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
        const module = await import("./LocalFileSource");
        return new module.LocalFileSource();
    }
}
