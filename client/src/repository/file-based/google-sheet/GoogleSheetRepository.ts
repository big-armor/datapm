import { DPMConfiguration } from "../../../../../lib/dist/src/PackageUtil";
import { authorize, getSpreadsheetMetadata, initOAuth2Client, setCredentials } from "../../../util/GoogleUtil";
import { Parameter, ParameterType } from "../../../util/parameters/Parameter";
import { Repository } from "../../Repository";
import { getSpreadsheetID } from "./GoogleSheetSourceDescription";

export class GoogleSheetRepository implements Repository {
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
                    validate: (value: string | number | boolean) => {
                        if (value == null || (value as string).length === 0) {
                            return "URL required";
                        }

                        const strValue = value as string;

                        if (!strValue.startsWith("https://docs.google.com/spreadsheets")) {
                            return "Must start with https://docs.google.com/spreadsheets";
                        }

                        return true;
                    }
                }
            ];
        }

        return parameters;
    }

    async getAuthenticationParameters(
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

    async testAuthentication(
        _connectionConfiguration: DPMConfiguration,
        _authenticationConfiguration: DPMConfiguration
    ): Promise<string | true> {
        return true; // TODO Implement
    }
}
