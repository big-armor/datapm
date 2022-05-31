import stringify from "csv-stringify/lib/sync";
import {
    DPMConfiguration,
    PackageFile,
    Schema,
    UpdateMethod,
    RecordStreamContext,
    Parameter,
    ParameterType
} from "datapm-lib";
import { Transform } from "stream";
import { RecordSerializedContext } from "../AbstractFileSink";
import { DPMRecordSerializer } from "./RecordSerializer";
import { DISPLAY_NAME, EXTENSION, MIME_TYPE } from "./RecordSerializerCSVDescription";

export class RecordSerializerCSV implements DPMRecordSerializer {
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    isStronglyTyped(_configuration: DPMConfiguration): boolean {
        return false;
    }

    getOutputMimeType(): string {
        return MIME_TYPE;
    }

    getFileExtension(): string {
        return EXTENSION;
    }

    getDefaultParameterValues(
        _catalogSlug: string | undefined,
        _packageFile: PackageFile,
        _configuration: DPMConfiguration
    ): DPMConfiguration {
        return {
            headers: true,
            quotes: true
        };
    }

    /** Return parameters interatively until no more questions are needed to be answered */
    getParameters(_packageFile: PackageFile, configuration: DPMConfiguration): Parameter[] {
        const parameters: Parameter[] = [];

        if (configuration.headers == null) {
            parameters.push({
                configuration,
                name: "headers",
                type: ParameterType.Confirm,
                message: "Include header row?",
                defaultValue: true
            });
        }

        if (configuration.quotes == null) {
            parameters.push({
                configuration,
                name: "quotes",
                type: ParameterType.Confirm,
                message: "Wrap all values in quotes?",
                defaultValue: true
            });
        }

        return parameters;
    }

    async getTransforms(
        schema: Schema,
        configuration: DPMConfiguration,
        updateMethod: UpdateMethod
    ): Promise<Transform[]> {
        if (configuration.quotes == null) throw new Error("CSV_SERIALIZER_REQUIRES_QUOTES_CONFIGURATION");
        if (configuration.headers == null) throw new Error("CSV_SERIALIZER_REQUIRES_HEADERS_CONFIGURATION");
        const options = {
            delimiter: configuration.delimeter?.toString() || ",",
            quoted: configuration.quotes as boolean,
            cast: {
                date: (value: Date) => {
                    return value.toISOString();
                }
            },
            header: (configuration.headers as boolean) === true && updateMethod === UpdateMethod.BATCH_FULL_SET
        };

        return [
            new Transform({
                objectMode: true,
                transform: async (chunks: RecordStreamContext[], _encoding, callback) => {
                    const recordSerializedContext: RecordSerializedContext = {
                        originalRecord: chunks[chunks.length - 1],
                        serializedValue: Buffer.from(
                            stringify(
                                chunks.map((c) => c.recordContext.record),
                                options
                            )
                        )
                    };

                    options.header = false;

                    callback(null, recordSerializedContext);
                }
            })
        ];
    }
}
