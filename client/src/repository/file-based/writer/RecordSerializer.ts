import { Transform } from "stream";
import { PackageFile, Schema, DPMConfiguration } from "datapm-lib";

import { UpdateMethod } from "../../Source";
import { Parameter } from "../../../util/parameters/Parameter";

export interface DPMRecordSerializerDescription {
    getDisplayName(): string;

    getOutputMimeType(): string;

    getFileExtension(): string;

    getRecordSerializer(): Promise<DPMRecordSerializer>;
}

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
