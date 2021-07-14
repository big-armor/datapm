import bufferPeek from "buffer-peek-stream";
import { DPMConfiguration } from "datapm-lib";
import mime from "mime-types";
import { Readable, Transform } from "stream";
import streamMmmagic from "stream-mmmagic";
import { StreamState } from "../sink/Sink";
import { findParser } from "../source/AbstractFileStreamSource";
import { SourceInspectionContext } from "../source/Source";
import { FileBufferSummary, ParserInspectionResults, Parser } from "./Parser";
import { getParserByMimeType } from "./ParserUtil";

export abstract class AbstractPassThroughParser implements Parser {
    abstract getDisplayName(): string;

    /** The unique identifier for the implementing parser */
    abstract getMimeType(): string;

    abstract getSupportedFileExtensions(configuration: DPMConfiguration): string[];

    abstract getSupportedMimeTypes(): string[];

    getFileExtensions(configuration: DPMConfiguration): string[] {
        const parserMimeTypeValue = configuration.innerFileMimeType;

        if (typeof parserMimeTypeValue !== "string") throw new Error("PASSTHROUGH_PARSER_MIME_TYPE_NOT_FOUND");

        const parser = getParserByMimeType(parserMimeTypeValue);

        if (parser == null) throw new Error("PARSER_NOT_FOUND - " + parserMimeTypeValue);

        const innerConfiguration = configuration.innerFileConfiguration;

        if (typeof innerConfiguration !== "object") throw new Error("PASSTHROUGH_INNER_CONFIGURATION_NOT_AN_OBJECT");

        return this.getSupportedFileExtensions(configuration).concat(
            parser.getFileExtensions(innerConfiguration as DPMConfiguration)
        );
    }

    supportsFileStream(streamSummary: FileBufferSummary): boolean {
        if (
            streamSummary.detectedMimeType != null &&
            this.getSupportedMimeTypes().includes(streamSummary.detectedMimeType)
        )
            return true;

        if (this.getSupportedFileExtensions({}).find((e) => streamSummary.fileName?.endsWith("." + e)) != null)
            return true;

        return false;
    }

    abstract getPassThroughTransforms(configuration: DPMConfiguration): Transform[];

    getTransforms(schemaPrefix: string, configuration: DPMConfiguration, streamState: StreamState): Transform[] {
        const parser = getParserByMimeType(configuration.innerFileMimeType as string);

        let transforms: Transform[] = this.getPassThroughTransforms(configuration);

        if (parser == null) throw new Error("PARSER_NOT_FOUND - " + configuration.innerFileMimeType);

        for (const fileExtension of parser.getFileExtensions(configuration.innerFileConfiguration as DPMConfiguration))
            schemaPrefix = schemaPrefix.replace(new RegExp(`\\.${fileExtension}$`, "i"), "");

        if (parser)
            transforms = transforms.concat(
                parser.getTransforms(
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
        context: SourceInspectionContext
    ): Promise<ParserInspectionResults> {
        const decompressorTransform = this.getPassThroughTransforms(configuration).reduce((prev, current) =>
            prev.pipe(current)
        );

        decompressorTransform.on("error", (error) => {
            console.error("DECOMPRESSION_ERROR: " + error.message);
        });

        const [magicMimeResults, decompressedReadable] = await streamMmmagic.promise(
            Readable.from(fileStreamSummary.buffer).pipe(decompressorTransform),
            {
                magicFile: "node_modules/mmmagic/magic/magic.mgc"
            }
        );

        const decompressedStream = Readable.from(fileStreamSummary.stream).pipe(decompressorTransform);
        const [decompressedBuffer] = await bufferPeek.promise(decompressedReadable, Math.pow(2, 20));

        decompressorTransform.destroy();

        let innerFileName = fileStreamSummary?.fileName;

        if (innerFileName !== undefined) {
            for (const e of this.getSupportedFileExtensions(configuration.innerFileConfiguration as DPMConfiguration)) {
                innerFileName = innerFileName.replace("." + e, "");
            }
        }

        const innerFileNameMimeType = innerFileName ? mime.lookup(innerFileName) : undefined;

        const innerFileSummary: FileBufferSummary = {
            uri: fileStreamSummary.uri + "!" + innerFileName,
            detectedMimeType: magicMimeResults.type,
            reportedMimeType: typeof innerFileNameMimeType === "string" ? innerFileNameMimeType : undefined,
            fileName: innerFileName,
            buffer: decompressedBuffer,
            stream: decompressedStream,
            lastUpdatedHash: fileStreamSummary.lastUpdatedHash
        };

        if (configuration.innerFileConfiguration == null) configuration.innerFileConfiguration = {};

        const parser = await findParser(innerFileSummary, configuration, context);

        configuration.innerFileMimeType = parser.getMimeType();

        for (const extension of parser.getFileExtensions(configuration)) {
            innerFileName = innerFileName?.replace(new RegExp(`\\.${extension}$`, "i"), "");
        }

        innerFileSummary.fileName = innerFileName;

        const innerFileResults = parser.inspectFile(
            innerFileSummary,
            configuration.innerFileConfiguration as DPMConfiguration,
            context
        );

        return innerFileResults;
    }
}
