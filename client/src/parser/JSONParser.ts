import { DPMConfiguration, DPMRecord } from "datapm-lib";
import * as jsonStream from "jsonstream-next";
import { Transform } from "stream";
import { RecordContext, SourceInspectionContext, UpdateMethod } from "../source/SourceUtil";
import { ParameterType } from "../util/ParameterUtils";
import { FileBufferSummary, ParserInspectionResults, Parser } from "./ParserUtil";

export class JSONParser implements Parser {
	getFileExtensions(): string[] {
		return ["json"];
	}

	getDisplayName(): string {
		return "JSON";
	}

	/** The unique identifier for the parser implementation */
	getMimeType(): string {
		return "application/json";
	}

	/** Should return true if the parser implementation will support parsing the given FileStreamSummary */
	supportsFileStream(streamSummary: FileBufferSummary): boolean {
		if (
			streamSummary.detectedMimeType !== null &&
			streamSummary.detectedMimeType !== "application/json" &&
			streamSummary.detectedMimeType !== "text/plain"
		)
			return false;
		return (
			streamSummary.uri.endsWith(".json") ||
			streamSummary.detectedMimeType === "application/json" ||
			streamSummary.reportedMimeType === "application/json" ||
			streamSummary.fileName?.toLowerCase().endsWith(".json") ||
			false
		);
	}

	/** Returns a set of parameters based on the provided uri and configuration */
	async inspectFile(
		fileStreamSummary: FileBufferSummary,
		configuration: DPMConfiguration,
		context: SourceInspectionContext
	): Promise<ParserInspectionResults> {
		if (configuration.jsonPath == null) {
			await context.parameterPrompt([
				{
					configuration,
					message: "JSONPath for data?",
					type: ParameterType.Text,
					name: "jsonPath"
				}
			]);
		}

		return {
			schemaPrefix: fileStreamSummary.fileName?.toLowerCase().replace(".json", ""),
			updateMethods: [UpdateMethod.BATCH_FULL_SET, UpdateMethod.APPEND_ONLY_LOG],
			stream: fileStreamSummary.stream
		};
	}

	/** Returns the transforms necessary parse based on the configuration */
	getTransforms(schemaPrefix: string, configuration?: DPMConfiguration): Transform[] {
		if (configuration == null) throw new Error("CONFIGURATION_REQUIRED_FOR_JSON_PARSER");
		if (configuration.jsonPath == null) throw new Error("JSON_PATH_CONFIGURATION_REQUIRED_FOR_JSON_PARSER");

		return [
			jsonStream.parse(configuration.jsonPath as string, (value) => {
				return value;
			}),
			// TODO - Implement offset by count
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
