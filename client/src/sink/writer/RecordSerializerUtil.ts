import { DPMConfiguration, PackageFile, Schema } from "datapm-lib";
import { Transform } from "stream";
import { Maybe } from "../../generated/graphql";
import { RecordContext, UpdateMethod } from "../../source/SourceUtil";
import { Parameter } from "../../util/ParameterUtils";
import { RecordSerializerCSV } from "./RecordSerializerCSV";
import { RecordSerializerJSON } from "./RecordSerializerJSON";
import { RecordSerializerAVRO } from "./RecordSerializerAVRO";

export interface DPMRecordSerializer {
	getDisplayName(): string;

	isStronglyTyped(configuration: DPMConfiguration): boolean;

	getOutputMimeType(): string;

	getFileExtension(): string;

	getDefaultParameterValues(
		catalogSlug: string | undefined,
		packageFile: PackageFile,
		configuration: DPMConfiguration
	): DPMConfiguration;

	/** Return parameters interatively until no more questions are needed to be answered */
	getParameters(packageFile: PackageFile, configuration: DPMConfiguration): Parameter[];

	/** A stream.Transform that accepts DPMRecord as chunks, and produces Buffer | string as putput  */
	getTransforms(schema: Schema, configuration: DPMConfiguration, updateMethod: UpdateMethod): Promise<Transform[]>;
}

export function getRecordSerializers(): DPMRecordSerializer[] {
	return [new RecordSerializerJSON(), new RecordSerializerCSV(), new RecordSerializerAVRO()];
}

export function getRecordSerializer(type: string): Maybe<DPMRecordSerializer> {
	const writers = getRecordSerializers();
	return (
		writers.find((writer) => {
			return writer.getOutputMimeType() === type;
		}) || null
	);
}

export function createStripRecordContextTransform(): Transform {
	return new Transform({
		objectMode: true,
		transform: (chunk: RecordContext, encoding, callback) => {
			callback(null, chunk.record);
		}
	});
}
