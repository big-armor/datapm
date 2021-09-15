import bufferPeek from "buffer-peek-stream";
import { DPMConfiguration } from "datapm-lib";
import mime from "mime-types";
import { Readable, Transform } from "stream";
import streamMmmagic from "stream-mmmagic";
import { StreamState } from "../../Sink";
import { findParser } from "../AbstractFileStreamSource";
import { SourceInspectionContext } from "../../Source";
import { FileBufferSummary, ParserInspectionResults, Parser } from "./Parser";
import { getParserByMimeType } from "./ParserUtil";

export abstract class AbstractPassThroughParser implements Parser {
    abstract getDisplayName(): string;

    /** The unique identifier for the implementing parser */
    abstract getMimeType(): string;

    abstract getSupportedMimeTypes(): string[];

    abstract getFileExtensions(): string[];

    abstract getPassThroughTransforms(configuration: DPMConfiguration): Transform[];

    async getTransforms(
        schemaPrefix: string,
        configuration: DPMConfiguration,
        streamState: StreamState
    ): Promise<Transform[]> {
        const parser = await getParserByMimeType(configuration.innerFileMimeType as string);

        let transforms: Transform[] = this.getPassThroughTransforms(configuration);

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
            buffer: decompressedBuffer,
            stream: decompressedStream,
            lastUpdatedHash: fileStreamSummary.lastUpdatedHash
        };

        if (configuration.innerFileConfiguration == null) configuration.innerFileConfiguration = {};

        const parser = await findParser(innerFileSummary, configuration, context);

        configuration.innerFileMimeType = parser.getMimeType();

        for (const extension of parser.getFileExtensions()) {
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
