import bufferPeek from "buffer-peek-stream";
import chalk from "chalk";
import { StreamState, DPMConfiguration, UpdateMethod, Parameter, ParameterType } from "datapm-lib";
import numeral from "numeral";
import streamMmmagic from "stream-mmmagic";
import { StreamSetPreview, InspectionResults, Source } from "../Source";
import { Maybe } from "../../util/Maybe";
import { getParser, getParserByMimeType, getParsers } from "./parser/ParserUtil";
import { nameFromFileUris } from "../../util/NameUtil";
import { FileBufferSummary, FileStreamContext, Parser, ParserInspectionResults } from "./parser/Parser";
import { asyncMap } from "../../util/AsyncUtils";
import path from "path";
import { JobContext } from "../../task/Task";
import { parser } from "@apollo/client";

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

    async inspectData(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        jobContext: JobContext
    ): Promise<InspectionResults> {
        // Loop over each URI

        let remainingParameter = await this.getInspectParameters(
            connectionConfiguration,
            credentialsConfiguration,
            configuration
        );

        while (remainingParameter.length > 0) {
            await jobContext.parameterPrompt(remainingParameter);
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
                await this.getRecordStreams(
                    connectionConfiguration,
                    credentialsConfiguration,
                    configuration,
                    jobContext
                )
            ]
        };
    }

    async getRecordStreams(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        jobContext: JobContext
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

        let uriIndex = 0;
        const fileStreamSummary = fileStreamSummaries[uriIndex];

        let { parserInspectionResults, parser } = await inspectFileStreamSummary(
            jobContext,
            configuration,
            fileStreamSummary
        );

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
                await jobContext.parameterPrompt([
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
                let currentFileStreamContext = await parserInspectionResults.moveToNextStream?.();

                if (!currentFileStreamContext) {
                    uriIndex++;

                    if (fileStreamSummaries.length <= uriIndex) {
                        return null;
                    }

                    ({ parserInspectionResults } = await inspectFileStreamSummary(
                        jobContext,
                        configuration,
                        fileStreamSummaries[uriIndex++]
                    ));

                    currentFileStreamContext = await parserInspectionResults.moveToNextStream?.();
                }

                if (!currentFileStreamContext) return null;

                return {
                    name: currentFileStreamContext.fileName as string,
                    expectedTotalRawBytes: currentFileStreamContext.fileSize,
                    updateMethod,
                    updateHash: currentFileStreamContext.lastUpdatedHash,
                    openStream: async (sinkState: Maybe<StreamState>) => {
                        if (currentFileStreamContext == null) {
                            throw new Error("currentFileStreamContext is null");
                        }

                        const fileStream = await currentFileStreamContext.openStream(sinkState);
                        return {
                            stream: fileStream.stream,
                            transforms: await parser.getTransforms(streamSetPreview.slug, configuration, {
                                schemaStates: {} // TODO this seems like it would break resumable streams
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

async function inspectFileStreamSummary(
    jobContext: JobContext,
    configuration: DPMConfiguration,
    fileStreamSummary: FileStreamContext
): Promise<{ parserInspectionResults: ParserInspectionResults; parser: Parser }> {
    const fileBufferSummary: FileBufferSummary = await getFileBufferSummary(fileStreamSummary, {
        schemaStates: {}
    });

    /* if (fileBufferSummary.fileName) {
        jobContext.print("INFO", `File Name: ${fileBufferSummary.fileName}`);
    }
    if (fileBufferSummary.fileSize) {
        const fileSizeString = numeral(fileBufferSummary.fileSize).format("0.0b");
        jobContext.print("INFO", `File Size: ${fileSizeString}`); // TODO - This is probably not right
    }
    if (fileBufferSummary.detectedMimeType) {
        jobContext.print("INFO", `File Type: ${fileBufferSummary.detectedMimeType}`);
    } */

    const parser = await findParser(fileBufferSummary, configuration, jobContext);

    const parserInspectionResults = await parser.inspectFile(fileBufferSummary, configuration, jobContext);

    return { parserInspectionResults, parser };
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
    jobContext: JobContext
): Promise<Parser> {
    let parser: Maybe<Parser> = null;

    if (configuration.parserMimeType != null) {
        parser = await getParserByMimeType(configuration.parserMimeType as string);
    } else {
        parser = await getParser(fileStreamSummary);
    }

    if (jobContext != null && parser == null) {
        jobContext.print("NONE", "\n");
        jobContext.print("NONE", chalk.grey("File type details"));

        if (fileStreamSummary.fileName != null) {
            jobContext.print("NONE", chalk.grey("File Name: ") + chalk.white(fileStreamSummary.fileName));
        }

        if (fileStreamSummary.reportedMimeType !== fileStreamSummary.detectedMimeType) {
            if (fileStreamSummary.reportedMimeType != null)
                jobContext.print(
                    "NONE",
                    chalk.grey("Reported MimeType: ") + chalk.white(fileStreamSummary.reportedMimeType)
                );

            if (fileStreamSummary.detectedMimeType != null)
                jobContext.print(
                    "NONE",
                    chalk.grey("Detected MimeType: ") + chalk.white(fileStreamSummary.detectedMimeType)
                );
        } else if (fileStreamSummary.detectedMimeType !== null) {
            jobContext.print("NONE", chalk.grey("MimeType: ") + chalk.white(fileStreamSummary.detectedMimeType));
        }

        jobContext.print("NONE", "\n");
        await jobContext.parameterPrompt([
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
