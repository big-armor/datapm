import { Transform } from "stream";
import { PackageFile, Schema, DPMConfiguration, UpdateMethod, Parameter } from "datapm-lib";

export interface DPMRecordSerializerDescription {
    getDisplayName(): string;

    /** Return the Mimetype of the file that will be written */
    getOutputMimeType(): string;

    /** Return the extension of the file that will be written. */
    getFileExtension(): string;

    /** Import the DPMRecordSerializer implementation in this method.
     * Do not import the class outside of this method.
     */
    getRecordSerializer(): Promise<DPMRecordSerializer>;
}

export interface DPMRecordSerializer {
    /** Return the user friendly display name.  */
    getDisplayName(): string;

    /** Whether the file format being written strictly controls the types of
     * each filed (ex: Avro).
     */
    isStronglyTyped(configuration: DPMConfiguration): boolean;

    /** Return the Mimetype of the file that will be written */
    getOutputMimeType(): string;

    /** Return the extension of the file that will be written. */
    getFileExtension(): string;

    /** Return the default values for any user options.
     *
     * This method may be depreciated in the future. Use the "default" value of the Parameter object
     * returned in the "getParameters" method instead.
     */
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
