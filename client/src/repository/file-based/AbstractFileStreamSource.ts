import bufferPeek from "buffer-peek-stream";
import chalk from "chalk";
import { StreamState, DPMConfiguration, UpdateMethod } from "datapm-lib";
import numeral from "numeral";
import streamMmmagic from "stream-mmmagic";
import { Parameter, ParameterType } from "../../util/parameters/Parameter";
import { StreamSetPreview, SourceInspectionContext, InspectionResults, Source } from "../Source";
import { Maybe } from "../../util/Maybe";
import { getParser, getParserByMimeType, getParsers } from "./parser/ParserUtil";
import { LogType } from "../../util/LoggingUtils";
import { nameFromFileUris } from "../../util/NameUtil";
import { FileBufferSummary, FileStreamContext, Parser } from "./parser/Parser";
import { asyncMap } from "../../util/AsyncUtils";
import path from "path";

export abstract class AbstractFileStreamSource implements Source {
    abstract sourceType(): string;

    /** Given a URL, return a set of ordered readers that will be used to parse records */
    abstract getFileStreams(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration?: DPMConfiguration
    ): Promise<FileStreamContext[]>;

    abstract getInspectParameters(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration
    ): Promise<Parameter[]>;

    async inspectURIs(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        context: SourceInspectionContext
    ): Promise<InspectionResults> {
        // Loop over each URI

        let remainingParameter = await this.getInspectParameters(
            connectionConfiguration,
            credentialsConfiguration,
            configuration
        );

        while (remainingParameter.length > 0) {
            await context.parameterPrompt(remainingParameter);
            remainingParameter = await this.getInspectParameters(
                connectionConfiguration,
                credentialsConfiguration,
                configuration
            );
        }

        const uris = (connectionConfiguration.uris || configuration.uris) as string[];

        if (uris == null || uris.length === 0) {
            throw new Error(
                "Could not find URIs in connectionConfiguration or configuration. This is a problem with the source implementation."
            );
        }

        const displayName = nameFromFileUris(uris);

        return {
            defaultDisplayName: displayName,
            source: this,
            configuration,
            streamSetPreviews: [
                await this.getRecordStreams(connectionConfiguration, credentialsConfiguration, configuration, context)
            ]
        };
    }

    async getRecordStreams(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        context: SourceInspectionContext
    ): Promise<StreamSetPreview> {
        const fileStreamSummaries = await this.getFileStreams(
            connectionConfiguration,
            credentialsConfiguration,
            configuration
        );

        const commonFileName = nameFromFileUris(fileStreamSummaries.map((f) => f.uri));

        if (fileStreamSummaries.length === 0) {
            throw new Error("NO_FILE_STREAM_FOUND");
        }

        const fileStreamSummary = fileStreamSummaries[0];
        const fileBufferSummary: FileBufferSummary = await getFileBufferSummary(fileStreamSummary, {
            schemaStates: {}
        });

        if (!context.quiet) {
            if (fileBufferSummary.fileName) {
                context.log(LogType.INFO, `File Name: ${fileBufferSummary.fileName}`);
            }
            if (fileBufferSummary.fileSize) {
                const fileSizeString = numeral(fileBufferSummary.fileSize).format("0.0b");
                context.log(LogType.INFO, `File Size: ${fileSizeString}`); // TODO - This is probably not right
            }
            if (fileBufferSummary.detectedMimeType) {
                context.log(LogType.INFO, `File Type: ${fileBufferSummary.detectedMimeType}`);
            }
        }

        const parser = await findParser(fileBufferSummary, configuration, context);

        const parserInspectionResults = await parser.inspectFile(fileBufferSummary, configuration, context);

        if (
            parserInspectionResults.updateMethods.length === 1 &&
            parserInspectionResults.updateMethods[0] === UpdateMethod.BATCH_FULL_SET
        ) {
            configuration.updateMethod = UpdateMethod.BATCH_FULL_SET;
        } else {
            if (
                configuration.updateMethod == null ||
                !parserInspectionResults.updateMethods.includes(
                    UpdateMethod[(configuration.updateMethod as string) as keyof typeof UpdateMethod]
                )
            ) {
                await context.parameterPrompt([
                    {
                        name: "updateMethod",
                        configuration,
                        message: "How are files updated?",
                        defaultValue: UpdateMethod.BATCH_FULL_SET,
                        options: [
                            {
                                title: "Edits are made throughout",
                                value: UpdateMethod.BATCH_FULL_SET,
                                selected: true
                            },
                            {
                                title: "Records are only appended to the end, and there are no other edits",
                                value: UpdateMethod.APPEND_ONLY_LOG
                            }
                        ],
                        type: ParameterType.Select
                    }
                ]);
            }
        }

        const updateMethod = UpdateMethod[configuration.updateMethod as keyof typeof UpdateMethod];

        const streamSetPreview: StreamSetPreview = {
            slug: commonFileName as string,
            configuration: {}, // TODO Probably not needed
            expectedBytesTotal: fileStreamSummaries.reduce((prev, curr) => {
                return prev + (curr.fileSize || 0);
            }, 0)
        };

        if (parserInspectionResults.stream) {
            streamSetPreview.streamSummaries = await asyncMap(fileStreamSummaries, async (f) => {
                return {
                    name: f.fileName,
                    updateMethod,
                    expectedTotalRawBytes: f.fileSize,
                    updateHash: f.lastUpdatedHash,
                    openStream: async (sinkState: Maybe<StreamState>) => {
                        const fileStreamContext = await f.openStream(sinkState);

                        return {
                            stream: fileStreamContext.stream,
                            transforms: await parser.getTransforms(streamSetPreview.slug, configuration, {
                                schemaStates: {}
                            }),
                            expectedTotalRawBytes: f.fileSize
                        };
                    }
                };
            });
        } else {
            streamSetPreview.moveToNextStream = async () => {
                const fileInspectionResult = await parserInspectionResults.moveToNextStream?.();
                if (!fileInspectionResult) {
                    return null;
                }

                return {
                    name: fileInspectionResult.fileName as string,
                    expectedTotalRawBytes: fileInspectionResult.fileSize,
                    updateMethod,
                    updateHash: fileInspectionResult.lastUpdatedHash,
                    openStream: async (sinkState: Maybe<StreamState>) => {
                        const fileStream = await fileInspectionResult.openStream(sinkState);
                        return {
                            stream: fileStream.stream,
                            transforms: await parser.getTransforms(streamSetPreview.slug, configuration, {
                                schemaStates: {}
                            }),
                            expectedTotalRawBytes: fileStream.fileSize
                        };
                    }
                };
            };
        }

        return streamSetPreview;
    }
}

export async function getFileBufferSummary(
    file: FileStreamContext,
    streamState: StreamState
): Promise<FileBufferSummary> {
    const streamContext = await file.openStream(streamState);

    let fileStream = streamContext.stream;

    const pathToMagicFile = path.join(path.dirname(process.execPath), "node_modules/mmmagic/magic/magic.mgc");

    const [magicMimeResults, mimeForkStream] = await streamMmmagic.promise(fileStream, {
        magicFile: pathToMagicFile
    });

    fileStream = mimeForkStream;

    const [rawFileBuffer, rawPeekStream] = await bufferPeek.promise(fileStream, Math.pow(2, 20));

    fileStream = rawPeekStream;

    const detectedMimeType = magicMimeResults.type;

    const returnValue: FileBufferSummary = {
        uri: file.uri,
        buffer: rawFileBuffer,
        stream: fileStream,
        fileName: file.fileName,
        fileSize: file.fileSize,
        lastUpdatedHash: file.lastUpdatedHash,
        reportedMimeType: file.reportedMimeType,
        detectedMimeType: detectedMimeType
    };

    return returnValue;
}

export async function findParser(
    fileStreamSummary: FileBufferSummary,
    configuration: DPMConfiguration,
    context: SourceInspectionContext
): Promise<Parser> {
    let parser: Maybe<Parser> = null;

    if (configuration.parserMimeType != null) {
        parser = await getParserByMimeType(configuration.parserMimeType as string);
    } else {
        parser = await getParser(fileStreamSummary);
    }

    if (context != null && parser == null) {
        console.log("\n");
        console.log(chalk.grey("File type details"));

        if (fileStreamSummary.fileName != null) {
            console.log(chalk.grey("File Name: ") + chalk.white(fileStreamSummary.fileName));
        }

        if (fileStreamSummary.reportedMimeType !== fileStreamSummary.detectedMimeType) {
            if (fileStreamSummary.reportedMimeType != null)
                console.log(chalk.grey("Reported MimeType: ") + chalk.white(fileStreamSummary.reportedMimeType));

            if (fileStreamSummary.detectedMimeType != null)
                console.log(chalk.grey("Detected MimeType: ") + chalk.white(fileStreamSummary.detectedMimeType));
        } else if (fileStreamSummary.detectedMimeType !== null) {
            console.log(chalk.grey("MimeType: ") + chalk.white(fileStreamSummary.detectedMimeType));
        }

        console.log("\n");
        await context.parameterPrompt([
            {
                configuration,
                message: "Could not automatically detect file type. Please select one.",
                name: "parserMimeType",
                type: ParameterType.Select,
                options: getParsers().map((p) => {
                    return {
                        title: p.getDisplayName(),
                        value: p.getMimeType()
                    };
                })
            }
        ]);

        parser = await getParserByMimeType(configuration.parserMimeType as string);
    }

    if (parser == null) {
        throw new Error(
            "PARSER_NOT_FOUND - " + fileStreamSummary.detectedMimeType + " - " + fileStreamSummary.fileName
        );
    }

    return parser;
}
