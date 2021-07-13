import avro from "avsc";
import { DPMConfiguration, DPMRecord } from "datapm-lib";
import { Transform, TransformCallback } from "stream";
import { RecordContext, SourceInspectionContext, UpdateMethod } from "../source/SourceUtil";
import { FileBufferSummary, ParserInspectionResults, Parser } from "./ParserUtil";

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
		return "AVRO";
	}

	/** The unique identifier for the parser implementation */
	getMimeType(): string {
		return "application/avro";
	}

	/** Should return true if the parser implementation will support parsing the given FileStreamSummary */
	supportsFileStream(streamSummary: FileBufferSummary): boolean {
		const firstFourBytes = streamSummary.buffer.toString("ascii", 0, 4);

		if (firstFourBytes === "Obj" + String.fromCharCode(1)) return true;
		return streamSummary.uri.endsWith(".avro") || streamSummary.fileName?.toLowerCase().endsWith(".avro") || false;
	}

	/** Returns a set of parameters based on the provided uri and configuration */
	async inspectFile(
		fileStreamSummary: FileBufferSummary,
		_configuration: DPMConfiguration,
		_context: SourceInspectionContext
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
						schemaSlug: schemaPrefix
					};
					callback(null, returnValue);
				}
			})
		];
	}
}
