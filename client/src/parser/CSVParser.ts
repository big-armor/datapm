import BomStrippingStream from "bomstrip";
import chalk from "chalk";
import { ColumnOption } from "csv-parse";
import csvParser from "csv-parse/lib/sync";
import { DPMConfiguration, DPMRecord } from "datapm-lib";
import { Transform } from "stream";
import { Maybe } from "../generated/graphql";
import { FileBufferSummary } from "../parser/ParserUtil";
import { StreamState } from "../sink/SinkUtil";
import { RecordContext, SourceInspectionContext, UpdateMethod } from "../source/SourceUtil";
import { ByteBatchingTransform } from "../source/transforms/ByteBatchingTransform";
import { RecordCountOffsetTransform } from "../source/transforms/RecordCountOffsetTransform";
import { ParameterType } from "../util/ParameterUtils";
import { ParserInspectionResults, Parser } from "./ParserUtil";

export class CSVParser implements Parser {
	getFileExtensions(): string[] {
		return ["csv", "tsv", "psv"];
	}

	public getDisplayName(): string {
		return "Comma Separated Values (CSV)";
	}

	public getMimeType(): string {
		return "text/csv";
	}

	public supportsFileStream(fileSummary: FileBufferSummary): boolean {
		if (
			fileSummary.detectedMimeType !== null &&
			fileSummary.detectedMimeType !== "text/csv" &&
			fileSummary.detectedMimeType !== "text/plain"
		)
			return false;
		return (
			fileSummary.detectedMimeType === "text/csv" ||
			fileSummary.reportedMimeType === "text/csv" ||
			fileSummary.fileName?.endsWith("csv") ||
			false
		);
	}

	public showPreview(lines: string[], startIndex = 0, paragraphLength = 10): number {
		const endIndex = Math.min(startIndex + paragraphLength, lines.length);
		for (let index = startIndex; index < endIndex; index += 1) {
			const line = lines[index];
			const shortendLine =
				line.length > process.stdout.columns ? line.substr(0, process.stdout.columns - 15) + "..." : line;
			console.log(chalk.white("Line " + (index + 1) + " -> ") + chalk.grey(shortendLine));
		}
		console.log("\n");
		return startIndex + paragraphLength;
	}

	public async inspectFile(
		fileStreamSummary: FileBufferSummary,
		configuration: DPMConfiguration,
		context: SourceInspectionContext
	): Promise<ParserInspectionResults> {
		const previewLines = fileStreamSummary.buffer.toString().split(/\n/g);
		let previewStartIndex = 0;

		if (configuration.delimiter == null) {
			if (
				fileStreamSummary.uri.endsWith(".csv") ||
				fileStreamSummary.fileName?.endsWith(".csv") ||
				fileStreamSummary.detectedMimeType === "text/csv" ||
				fileStreamSummary.reportedMimeType === "text/csv"
			) {
				configuration.delimiter = ",";
			} else if (
				fileStreamSummary.uri.endsWith(".tsv") ||
				fileStreamSummary.fileName?.endsWith(".tsv") ||
				fileStreamSummary.detectedMimeType === "text/tsv" ||
				fileStreamSummary.reportedMimeType === "text/tsv"
			) {
				configuration.delimiter = "	";
			} else if (
				fileStreamSummary.uri.endsWith(".psv") ||
				fileStreamSummary.fileName?.endsWith(".psv") ||
				fileStreamSummary.detectedMimeType === "text/psv" ||
				fileStreamSummary.reportedMimeType === "text/psv"
			) {
				configuration.delimiter = "|";
			} else {
				await context.parameterPrompt([
					{
						configuration,
						message: "Separator character?",
						type: ParameterType.Select,
						name: "delimiter",
						options: [
							{
								title: "Comma ,",
								value: ",",
								selected: true
							},
							{
								title: "Tab \\t",
								value: "	",
								selected: false
							},
							{
								title: "Pipe |",
								value: "|",
								selected: false
							}
						]
					}
				]);
			}
		}

		if (configuration.hasHeaderRow == null) {
			while (true) {
				previewStartIndex += this.showPreview(previewLines, previewStartIndex);
				await context.parameterPrompt([
					{
						configuration,
						name: "hasHeaderRow",
						message: "Is there a header line above?",
						type: ParameterType.Select,
						options: [
							{
								title: "Yes",
								value: "true"
							},
							{
								title: "No",
								value: false
							},
							{
								title: "Show more",
								value: "show_more"
							}
						]
					}
				]);
				if (configuration.hasHeaderRow !== "show_more" || previewLines.length <= previewStartIndex) {
					configuration.hasHeaderRow = configuration.hasHeaderRow === "true" ? "true" : false;
					break;
				}
			}
		}

		if (configuration.hasHeaderRow === "true" && configuration.headerRowNumber == null) {
			await context.parameterPrompt([
				{
					configuration,
					message: "Header row line number?",
					type: ParameterType.Number,
					name: "headerRowNumber"
				}
			]);
			configuration.headerRowNumber = configuration.headerRowNumber ? +configuration.headerRowNumber - 1 : 0;
		}

		return {
			schemaPrefix: fileStreamSummary.fileName?.replace(".csv", ""),
			updateMethods: [UpdateMethod.BATCH_FULL_SET, UpdateMethod.APPEND_ONLY_LOG],
			stream: fileStreamSummary.stream
		};
	}

	public getTransforms(
		schemaPrefix: string,
		configuration: DPMConfiguration,
		streamState: Maybe<StreamState>
	): Transform[] {
		let lineOffset = streamState?.schemaStates[schemaPrefix]?.lastOffset;

		if (lineOffset == null) lineOffset = -1;

		let recordCount = 0;

		let headerFound = false;

		let columnsDiscovered: string[];

		return [
			new ByteBatchingTransform(100000, "\n"),
			new BomStrippingStream(),
			new Transform({
				readableObjectMode: true,
				writableObjectMode: false,
				transform: (chunk, encoding, callback) => {
					if (typeof configuration?.hasHeaderRow === "string") {
						configuration.hasHeaderRow = configuration?.hasHeaderRow === "true";
					}

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
						quote: (configuration?.quote as string) || '"',
						delimiter: configuration?.delimiter as string,
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
							for (let i = 0; i < recordArray.length; i++) {
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
			new RecordCountOffsetTransform(lineOffset)
		];
	}
}
