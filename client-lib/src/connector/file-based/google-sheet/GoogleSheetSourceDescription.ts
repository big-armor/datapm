import { SourceDescription, Source } from "../../../connector/Source";
import { ConnectorConfigurationSet } from "../../../main";
import { TYPE, DISPLAY_NAME } from "./GoogleSheetConnectorDescription";

export class GoogleSheetSourceDescription implements SourceDescription {
    sourceType(): string {
        return TYPE;
    }

    /** The user friendly name of the source implementation */
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    supportsURI(uri: string): false | ConnectorConfigurationSet {
        if (uri.startsWith("https://docs.google.com/spreadsheets") && getSpreadsheetID(uri) != null) {
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
        const module = await import("./GoogleSheetSource");
        return new module.GoogleSheetSource();
    }
}

export function getSpreadsheetID(uri: string): string | null {
    const regExp = /([\w-]){44}/;
    const result = uri.match(regExp);
    if (!result) return null;
    return result[0];
}
