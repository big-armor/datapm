import { DPMConfiguration, DPMRecord, RecordContext, UpdateMethod, ParameterType } from "datapm-lib";
import * as jsonStream from "jsonstream-next";
import { Transform } from "stream";
import { JobContext } from "../../../task/Task";
import { DISPLAY_NAME, MIME_TYPE } from "./JSONParserDescription";
import { FileBufferSummary, ParserInspectionResults, Parser } from "./Parser";

export class JSONParser implements Parser {
    getFileExtensions(): string[] {
        return ["json"];
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
        configuration: DPMConfiguration,
        jobContext: JobContext
    ): Promise<ParserInspectionResults> {
        if (configuration.jsonPath == null) {
            await jobContext.parameterPrompt([
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
