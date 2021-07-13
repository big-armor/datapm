import bufferPeek from "buffer-peek-stream";
import chalk from "chalk";
import csvParser from "csv-parse/lib/sync";
import { DPMConfiguration, DPMRecord } from "datapm-lib";
import { https } from "follow-redirects";
import { Readable, Transform } from "stream";
import {
    authorize,
    getOAuth2Client,
    getSpreadsheetMetadata,
    initOAuth2Client,
    setCredentials
} from "../util/GoogleUtil";
import { Parameter, ParameterType } from "../util/parameters/Parameter";
import { QuoteTransform } from "../source/transforms/QuoteTransform";
import { RecordCountOffsetTransform } from "../source/transforms/RecordCountOffsetTransform";
import { ByteBatchingTransform } from "../source/transforms/ByteBatchingTransform";
import {
    StreamSetPreview,
    SourceInspectionContext as URIInspectionContext,
    InspectionResults,
    SourceInterface,
    UpdateMethod,
    RecordContext
} from "./SourceUtil";
import BomStrippingStream from "bomstrip";
import { ColumnOption } from "csv-parse";
import { LogType } from "../util/LoggingUtils";

export class GoogleSheetSource implements SourceInterface {
    sourceType(): string {
        return "googlesheet";
    }

    supportsURI(uri: string): boolean {
        if (uri.startsWith("https://docs.google.com/spreadsheets")) {
            if (!this.getSpreadsheetID(uri)) {
                console.log(chalk.red("Invalid google sheet URI"));
                process.exit(1);
            }
            return true;
        }
        return false;
    }

    removeSecretConfigValues(
        _configuration: DPMConfiguration
        // eslint-disable-next-line @typescript-eslint/no-empty-function
    ): void {}

    getSpreadsheetID(uri: string): string | null {
        const regExp = /([\w-]){44}/;
        const result = uri.match(regExp);
        if (!result) return null;
        return result[0];
    }

    async getInspectParameters(configuration: DPMConfiguration): Promise<Parameter[]> {
        const parameters: Parameter[] = [];

        if (typeof configuration.uri === "string") {
            configuration.uris = [configuration.uri];
            delete configuration.uri;
        }

        if (configuration.uris == null || (configuration.uris as string[]).length === 0) {
            return [
                {
                    configuration,
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

        await initOAuth2Client();
        let isAllPublic = true;
        for (const uri of configuration.uris as string[]) {
            const spreadsheetId = this.getSpreadsheetID(uri) as string;
            isAllPublic = isAllPublic && !!(await getSpreadsheetMetadata(spreadsheetId));
        }

        if (!isAllPublic) {
            if (process.env.GOOGLE_OAUTH_CODE == null) {
                authorize();

                parameters.push({
                    configuration: process.env as DPMConfiguration,
                    type: ParameterType.Text,
                    name: "GOOGLE_OAUTH_CODE",
                    message: "Enter the code from that page here: "
                });

                return parameters;
            }

            await setCredentials();
        }

        return [];
    }

    async inspectURIs(configuration: DPMConfiguration, context: URIInspectionContext): Promise<InspectionResults> {
        const uris = configuration.uris as string[];
        if (uris != null && uris.length > 1) {
            throw new Error("GOOGLE_SHEET_SOURCE_DOES_NOT_SUPPORT_MULTIPLE_URIS");
        }

        let remainingParameter = await this.getInspectParameters(configuration);

        while (remainingParameter.length > 0) {
            await context.parameterPrompt(remainingParameter);
            remainingParameter = await this.getInspectParameters(configuration);
        }

        let spreedsheetStreams: StreamSetPreview[] = [];

        const titles: string[] = [];

        for (const uri of configuration.uris as string[]) {
            const sheetMetadata = await this.getSheetStreams(uri, configuration, context);
            titles.push(sheetMetadata.fileName);

            spreedsheetStreams = spreedsheetStreams.concat(sheetMetadata.streamSetPreviews);
        }

        return {
            defaultDisplayName: titles[0],
            source: this,
            configuration,
            streamSetPreviews: spreedsheetStreams
        };
    }

    async getSheetStreams(
        uri: string,
        configuration: DPMConfiguration,
        context: URIInspectionContext
    ): Promise<{ streamSetPreviews: StreamSetPreview[]; fileName: string }> {
        // TODO - Support wildcard in paths, to read many files in single batch set
        // A wild card would indicate one set of files for a single stream

        const spreadsheetId = this.getSpreadsheetID(uri) as string;
        const spreadsheetMetadata = await getSpreadsheetMetadata(spreadsheetId);
        const accessToken = getOAuth2Client().credentials.access_token;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sheetUris = spreadsheetMetadata.sheets.map((sheet: { properties: { sheetId: any } }) => {
            let uri = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?gid=${sheet.properties.sheetId}&format=csv`;
            if (accessToken) {
                uri = `${uri}&access_token=${accessToken}`;
            }
            return uri;
        });

        const sheetStreams: StreamSetPreview[] = [];
        for (let i = 0; i < sheetUris.length; i += 1) {
            const sheetUri = sheetUris[i];
            const sheetTitle = spreadsheetMetadata.sheets[i].properties.title;
            configuration[sheetTitle] = configuration[sheetTitle] || {};
            const sheetConfiguration = configuration[sheetTitle] as DPMConfiguration;

            const sheetStream: StreamSetPreview = {
                slug: sheetTitle,
                configuration: {},
                supportedUpdateMethods: [UpdateMethod.BATCH_FULL_SET],
                updateHash: new Date().toISOString(),
                streamSummaries: [
                    {
                        name: sheetTitle,
                        openStream: async () => {
                            return new Promise((resolve, reject) => {
                                const request = https.get(sheetUri, async (response) => {
                                    if (!context.quiet) {
                                        context.log(LogType.INFO, `Sheet Name: ${sheetTitle}`);
                                    }

                                    const stream = await this.inspectSheet(response, sheetConfiguration, context);

                                    return resolve({
                                        stream,
                                        transforms: this.getTransforms(sheetTitle, sheetConfiguration)
                                    });
                                });

                                request.on("error", (error: Error) => {
                                    reject(error);
                                });
                            });
                        }
                    }
                ]
            };
            sheetStreams.push(sheetStream);
        }

        return {
            streamSetPreviews: sheetStreams,
            fileName: spreadsheetMetadata.properties.title
        };
    }

    async inspectSheet(
        stream: Readable,
        sheetConfiguration: DPMConfiguration,
        context: URIInspectionContext
    ): Promise<Readable> {
        const [rawFileBuffer, rawPeekStream] = await bufferPeek.promise(stream, Math.pow(2, 20));

        if (sheetConfiguration.hasHeaderRow == null) {
            const lines = rawFileBuffer.toString().split(/\n/g);
            for (let index = 0; index < lines.length; index += 1) {
                const line = lines[index];
                const shortendLine =
                    line.length > process.stdout.columns ? line.substr(0, process.stdout.columns - 15) + "..." : line;

                console.log(chalk.white("Line " + index + " -> ") + chalk.grey(shortendLine));

                if (index > 11) break;
            }
            console.log("\n");

            await context.parameterPrompt([
                {
                    configuration: sheetConfiguration,
                    name: "hasHeaderRow",
                    message: "Is there a header line above?",
                    type: ParameterType.Confirm
                }
            ]);
        }

        if (sheetConfiguration.hasHeaderRow && sheetConfiguration.headerRowNumber == null) {
            await context.parameterPrompt([
                {
                    configuration: sheetConfiguration,
                    message: "Header row line number?",
                    type: ParameterType.Number,
                    name: "headerRowNumber"
                }
            ]);
        }

        return rawPeekStream;
    }

    getTransforms(schemaPrefix: string, configuration: DPMConfiguration): Transform[] {
        let recordCount = 0;

        let headerFound = false;

        let columnsDiscovered: string[];

        return [
            new ByteBatchingTransform(100000, "\n"),
            new BomStrippingStream(),
            new QuoteTransform(),
            new Transform({
                readableObjectMode: true,
                writableObjectMode: false,
                transform: (chunk, encoding, callback) => {
                    let columns: ColumnOption[] | boolean | undefined = false;

                    if ((configuration?.hasHeaderRow as boolean) === true) {
                        if (!headerFound) {
                            columns = true;
                        } else {
                            columns = columnsDiscovered;
                        }
                    } else {
                        columns = undefined;
                    }

                    const records = csvParser(chunk, {
                        columns: columns,
                        quote: '"',
                        delimiter: ",",
                        from_line:
                            !headerFound && (configuration?.hasHeaderRow as boolean)
                                ? (configuration?.headerRowNumber as number) + 1
                                : 1
                    });

                    if (!headerFound) {
                        headerFound = true;
                        columnsDiscovered = Object.keys(records[0]);
                    }

                    const recordsWithContext: RecordContext[] = [];

                    for (const recordArray of records) {
                        let recordObject: DPMRecord = {};

                        if (configuration?.hasHeaderRow !== true) {
                            for (let i = 0; i < recordArray.length; i += 1) {
                                recordObject["Column" + i] = recordArray[i];
                            }
                        } else {
                            recordObject = recordArray;
                        }

                        recordsWithContext.push({
                            record: recordObject,
                            schemaSlug: schemaPrefix,
                            offset: recordCount++
                        });
                    }

                    callback(null, recordsWithContext);
                }
            }),
            new RecordCountOffsetTransform(-1)
        ];
    }
}
