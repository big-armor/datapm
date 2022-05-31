import { DPMConfiguration, DPMRecord, RecordContext, UpdateMethod, ParameterType } from "datapm-lib";
import { Transform } from "stream";
import { FileBufferSummary, ParserInspectionResults, Parser } from "./Parser";

import XmlParser from "xml-streamer";
import { DISPLAY_NAME, MIME_TYPE } from "./XMLParserDescription";
import { JobContext } from "../../../task/JobContext";
import { convertValueByValueType, discoverValueTypeFromString } from "../../../util/SchemaUtil";

export class XMLParser implements Parser {
    getFileExtensions(): string[] {
        return ["xml"];
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
        context: JobContext
    ): Promise<ParserInspectionResults> {
        if (configuration.xmlPath == null) {
            await context.parameterPrompt([
                {
                    configuration,
                    message: "XPath for data nodes?",
                    type: ParameterType.Text,
                    defaultValue: 0,
                    name: "xmlPath"
                }
            ]);
        }

        return {
            schemaPrefix: fileStreamSummary.fileName?.replace(".xml", ""),
            updateMethods: [UpdateMethod.BATCH_FULL_SET, UpdateMethod.APPEND_ONLY_LOG],
            stream: fileStreamSummary.stream
        };
    }

    /** Returns the transforms necessary parse based on the configuration */
    getTransforms(schemaPrefix: string, configuration?: DPMConfiguration): Transform[] {
        if (configuration == null) throw new Error("CONFIGURATION_REQUIRED_FOR_XML_PARSER");
        if (configuration.xmlPath == null) throw new Error("XPATH_CONFIGURATION_REQUIRED_FOR_XML_PARSER");

        let recordIndex = 0;

        return [
            new XmlParser({
                explicitArray: false,
                resourcePath: configuration.xmlPath as string
            }),
            // TODO - impelement offset by record count
            new Transform({
                objectMode: true,
                transform: (xmlRecord: { [key: string]: unknown }, encoding: BufferEncoding, callback) => {
                    const record = flattenXMLNodes("", {}, xmlRecord);

                    const recordContext: RecordContext = {
                        record,
                        schemaSlug: schemaPrefix,
                        offset: recordIndex++,
                        receivedDate: new Date()
                    };

                    callback(null, recordContext);
                }
            })
        ];
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function flattenXMLNodes(prefix: string, object: { [key: string]: any }, xmlNodes: { [key: string]: any }): DPMRecord {
    const topKeys = Object.keys(xmlNodes);

    for (const topKey of topKeys) {
        const keyWithPrefix = prefix === "" ? topKey : prefix + "." + topKey;

        if (topKey === "$") {
            flattenXMLNodes("", object, xmlNodes.$ as { [key: string]: unknown });
        } else if (topKey === "_") {
            const value = xmlNodes._ as string;

            const type = discoverValueTypeFromString(value);

            const convertedValue = convertValueByValueType(value, type);

            object[prefix] = convertedValue;
        } else if (typeof xmlNodes[topKey] === "object") {
            // TODO handle arrays?
            flattenXMLNodes(keyWithPrefix, object, xmlNodes[topKey] as { [key: string]: unknown });
        } else {
            const value = xmlNodes[topKey];

            const type = discoverValueTypeFromString(value);

            const convertedValue = convertValueByValueType(value, type);

            object[keyWithPrefix] = convertedValue;
        }
    }

    return object as DPMRecord;
}
