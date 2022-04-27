import chalk from "chalk";
import fetch from "cross-fetch";
import { DPMConfiguration } from "datapm-lib";
import { google } from "googleapis";
import open from "open";
import { JobContext } from "../main";

const API_KEY_FILE_URI = "https://storage.googleapis.com/datapm-public-assets/datapm-client-google-api-keys.json";
const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let oAuth2Client: any = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getOAuth2Client(): any {
    return oAuth2Client;
}

export async function initOAuth2Client(): Promise<void> {
    if (oAuth2Client) return;
    const result = await fetch(API_KEY_FILE_URI).then((res) => res.json());
    const { client_id: clientId, client_secret: clientSecret, redirect_uris: redirectUris } = result.oauthKey.installed;
    process.env.GOOGLE_API_KEY = result.apiKey;
    oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUris[0]);
}

export function authorize(jobContext: JobContext): void {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES
    });
    jobContext.print("NONE", "Authorize DataPM by visiting this url: " + authUrl);
    // TODO GUI client will need a special parameter prompt for OAuth
    open(authUrl);
}

export async function setCredentials(credentialsConfiguration: DPMConfiguration): Promise<void> {
    try {
        const { tokens } = await oAuth2Client.getToken(credentialsConfiguration.GOOGLE_OAUTH_CODE as string);
        oAuth2Client.setCredentials(tokens);
    } catch (error) {
        console.log(chalk.red(error.message));
        process.exit(1);
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getSpreadsheetMetadata(spreadsheetId: string): Promise<any> {
    try {
        let headers = {};
        if (oAuth2Client.credentials.access_token) {
            headers = {
                Authorization: `Bearer ${oAuth2Client.credentials.access_token}`
            };
        }
        const result = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${process.env.GOOGLE_API_KEY}`,
            {
                headers
            }
        ).then((res) => res.json());
        if (result.error) {
            return null;
        }
        return result;
    } catch (error) {
        return null;
    }
}
