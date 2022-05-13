import avro from "avsc";
import { DPMConfiguration, DPMRecord, RecordContext, UpdateMethod } from "datapm-lib";
import { Transform, TransformCallback } from "stream";
import { DISPLAY_NAME, MIME_TYPE } from "./AVROParserDescription";
import { FileBufferSummary, ParserInspectionResults, Parser } from "./Parser";
import { JobContext } from "../../../task/JobContext";

class BlockDecoder extends avro.streams.BlockDecoder {
    // eslint-disable-next-line
    _transform(chunk: any, _encoding: BufferEncoding, callback: TransformCallback) {
        callback(null, chunk);
    }

    _flush(callback: TransformCallback) {
        callback();
    }
}

export class AVROParser implements Parser {
    getFileExtensions(): string[] {
        return ["avro"];
    }

    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    /** The unique identifier for the parser implementation */
    getMimeType(): string {
        return MIME_TYPE;
    }

    /** Returns a set of parameters based on the provided uri and configuration */
    async inspectFile(
        fileStreamSummary: FileBufferSummary,
        _configuration: DPMConfiguration,
        _context: JobContext
    ): Promise<ParserInspectionResults> {
        return {
            schemaPrefix: fileStreamSummary.fileName?.toLowerCase().replace(".avro", ""),
            updateMethods: [UpdateMethod.BATCH_FULL_SET],
            stream: fileStreamSummary.stream
        };
    }

    /** Returns the transforms necessary parse based on the configuration */
    getTransforms(schemaPrefix: string, _configuration?: DPMConfiguration): Array<Transform> {
        return [
            new BlockDecoder(),
            new Transform({
                objectMode: true,
                transform: (chunk: DPMRecord, encoding, callback) => {
                    const returnValue: RecordContext = {
                        record: chunk,
                        schemaSlug: schemaPrefix,
                        receivedDate: new Date()
                    };
                    callback(null, returnValue);
                }
            })
        ];
    }
}
