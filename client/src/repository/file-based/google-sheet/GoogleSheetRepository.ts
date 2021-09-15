import { DPMConfiguration } from "datapm-lib";
import { authorize, getSpreadsheetMetadata, initOAuth2Client, setCredentials } from "../../../util/GoogleUtil";
import { Parameter, ParameterType } from "../../../util/parameters/Parameter";
import { Repository } from "../../Repository";
import { TYPE } from "./GoogleSheetRepositoryDescription";
import { getSpreadsheetID } from "./GoogleSheetSourceDescription";

export class GoogleSheetRepository implements Repository {
    getType(): string {
        return TYPE;
    }

    requiresConnectionConfiguration(): boolean {
        return true;
    }

    userSelectableConnectionHistory(): boolean {
        return false;
    }

    requiresCredentialsConfiguration(): boolean {
        return true;
    }

    async getConnectionIdentifierFromConfiguration(_configuration: DPMConfiguration): Promise<string> {
        return "Google Sheets"; // TODO Should probably move these from Source and Sink implementations to here
    }

    async getCredentialsIdentifierFromConfiguration(_configuration: DPMConfiguration): Promise<string> {
        return "OAuth"; // TODO Figure out how to use the Oauth token to extract a username if necessary
    }

    getConnectionParameters(connectionConfiguration: DPMConfiguration): Parameter[] | Promise<Parameter[]> {
        const parameters: Parameter[] = [];

        if (typeof connectionConfiguration.uri === "string") {
            connectionConfiguration.uris = [connectionConfiguration.uri];
            delete connectionConfiguration.uri;
        }

        if (connectionConfiguration.uris == null || (connectionConfiguration.uris as string[]).length === 0) {
            return [
                {
                    configuration: connectionConfiguration,
                    type: ParameterType.Text,
                    name: "uri",
                    message: "URL of Google Sheet?",
                    stringRegExp: {
                        pattern: /^https:\/\/docs\.google\.com\/spreadsheets/i,
                        message: "Must be a Google Sheet URL"
                    }
                }
            ];
        }

        return parameters;
    }

    async getCredentialsParameters(
        connectionConfiguration: DPMConfiguration,
        authenticationConfiguration: DPMConfiguration
    ): Promise<Parameter[]> {
        const parameters: Parameter[] = [];

        await initOAuth2Client();
        let isAllPublic = true;
        for (const uri of connectionConfiguration.uris as string[]) {
            const spreadsheetId = getSpreadsheetID(uri) as string;
            isAllPublic = isAllPublic && !!(await getSpreadsheetMetadata(spreadsheetId));
        }

        if (!isAllPublic) {
            if (process.env.GOOGLE_OAUTH_CODE == null) {
                authorize();

                parameters.push({
                    configuration: authenticationConfiguration,
                    type: ParameterType.Text,
                    name: "GOOGLE_OAUTH_CODE",
                    message: "Enter the code from that page here: "
                });

                return parameters;
            }

            await setCredentials();
        }

        return parameters;
    }

    async testConnection(_connectionConfiguration: DPMConfiguration): Promise<string | true> {
        return true; // TODO Implement
    }

    async testCredentials(
        _connectionConfiguration: DPMConfiguration,
        _authenticationConfiguration: DPMConfiguration
    ): Promise<string | true> {
        return true; // TODO Implement
    }
}
