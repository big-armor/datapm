import bufferPeek from "buffer-peek-stream";
import { StreamState, DPMConfiguration } from "datapm-lib";
import mime from "mime-types";
import { Transform } from "stream";
import streamMmmagic from "stream-mmmagic";
import { findParser } from "../AbstractFileStreamSource";
import { FileBufferSummary, ParserInspectionResults, Parser, FileStreamContext } from "./Parser";
import { getParserByMimeType } from "./ParserUtil";
import path from "path";
import { JobContext } from "../../../task/JobContext";

export interface FileIterator {
    moveToNextFile(): Promise<FileStreamContext | null>;
}

export abstract class AbstractArchiveParser implements Parser {
    abstract getDisplayName(): string;

    /** The unique identifier for the implementing parser */
    abstract getMimeType(): string;

    abstract getSupportedMimeTypes(): string[];

    abstract getFileExtensions(): string[];

    supportsFileStream(streamSummary: FileBufferSummary): boolean {
        if (
            streamSummary.detectedMimeType != null &&
            this.getSupportedMimeTypes().includes(streamSummary.detectedMimeType)
        )
            return true;

        if (this.getFileExtensions().find((e) => streamSummary.fileName?.endsWith("." + e)) != null) return true;

        return false;
    }

    abstract getInnerFileIterator(
        fileBufferSummary: FileBufferSummary,
        configuration: DPMConfiguration,
        jobContext: JobContext
    ): Promise<FileIterator>;

    async getTransforms(
        schemaPrefix: string,
        configuration: DPMConfiguration,
        streamState: StreamState
    ): Promise<Transform[]> {
        const parser = await getParserByMimeType(configuration.innerFileMimeType as string);

        let transforms: Transform[] = [];

        if (parser == null) throw new Error("PARSER_NOT_FOUND - " + configuration.innerFileMimeType);

        for (const fileExtension of parser.getFileExtensions())
            schemaPrefix = schemaPrefix.replace(new RegExp(`\\.${fileExtension}$`, "i"), "");

        if (parser)
            transforms = transforms.concat(
                await parser.getTransforms(
                    schemaPrefix,
                    configuration.innerFileConfiguration as DPMConfiguration,
                    streamState
                )
            );

        return transforms;
    }

    async inspectFile(
        fileStreamSummary: FileBufferSummary,
        configuration: DPMConfiguration,
        jobContext: JobContext
    ): Promise<ParserInspectionResults> {
        const innerFileIterator = await this.getInnerFileIterator(fileStreamSummary, configuration, jobContext);

        const firstInnerFile = await innerFileIterator.moveToNextFile();

        if (firstInnerFile == null)
            throw new Error("NO_INNER_FILE_FOUND - " + fileStreamSummary.fileName || "unknown file");

        const fileStreamContext = await firstInnerFile.openStream({
            schemaStates: {}
        });

        const pathToMagicFile = path.join(path.dirname(process.execPath), "node_modules/mmmagic/magic/magic.mgc");

        const [magicMimeResults, firstInnerFileReadable] = await streamMmmagic.promise(fileStreamContext.stream, {
            magicFile: pathToMagicFile
        });

        const [firstInnerFilebuffer, firstInnerFileReadable2] = await bufferPeek.promise(
            firstInnerFileReadable,
            Math.pow(2, 20)
        );

        let innerFileName = firstInnerFile.fileName;

        if (innerFileName !== undefined) {
            for (const e of this.getFileExtensions()) {
                innerFileName = innerFileName.replace("." + e, "");
            }
        }

        const innerFileNameMimeType = innerFileName ? mime.lookup(innerFileName) : undefined;

        const innerFileSummary: FileBufferSummary = {
            uri: fileStreamSummary.uri + "!" + innerFileName,
            detectedMimeType: magicMimeResults.type,
            reportedMimeType: typeof innerFileNameMimeType === "string" ? innerFileNameMimeType : undefined,
            fileName: innerFileName,
            buffer: firstInnerFilebuffer,
            stream: firstInnerFileReadable2,
            lastUpdatedHash: fileStreamSummary.lastUpdatedHash
        };

        if (configuration.innerFileConfiguration == null) configuration.innerFileConfiguration = {};

        const parser = await findParser(innerFileSummary, configuration, jobContext);

        configuration.innerFileMimeType = parser.getMimeType();

        for (const extension of parser.getFileExtensions()) {
            innerFileName = innerFileName?.replace(new RegExp(`\\.${extension}$`, "i"), "");
        }

        innerFileSummary.fileName = innerFileName;

        const innerFileResults = await parser.inspectFile(
            innerFileSummary,
            configuration.innerFileConfiguration as DPMConfiguration,
            jobContext
        );

        let streamIndex = 0;

        return {
            updateMethods: innerFileResults.updateMethods,
            schemaPrefix: innerFileResults.schemaPrefix,
            moveToNextStream: async () => {
                if (streamIndex++ === 0)
                    return {
                        detectedMimeType: innerFileSummary.detectedMimeType,
                        reportedMimeType: innerFileSummary.reportedMimeType,
                        openStream: () => {
                            return Promise.resolve({
                                detectedMimeType: innerFileSummary.detectedMimeType,
                                reportedMimeType: innerFileSummary.reportedMimeType,
                                fileName: innerFileSummary.fileName,
                                fileSize: innerFileSummary.fileSize,
                                stream: innerFileSummary.stream,
                                lastUpdatedHash: innerFileSummary.lastUpdatedHash
                            });
                        },
                        uri: innerFileSummary.uri,
                        fileName: innerFileSummary.fileName,
                        fileSize: innerFileSummary.fileSize,
                        lastUpdatedHash: innerFileSummary.lastUpdatedHash
                    };
                else {
                    return innerFileIterator.moveToNextFile();
                }
            }
        };
    }
}
