import { DPMConfiguration, DPMRecord } from "datapm-lib";
import { Transform } from "stream";
import { RecordContext, SourceInspectionContext, UpdateMethod } from "../source/SourceUtil";
import { FileBufferSummary, ParserInspectionResults, Parser } from "./ParserUtil";

import XmlParser from "xml-streamer";
import { ParameterType } from "../util/ParameterUtils";

export class XMLParser implements Parser {
    getFileExtensions(): string[] {
        return ["xml"];
    }

    getDisplayName(): string {
        return "XML";
    }

    /** The unique identifier for the parser implementation */
    getMimeType(): string {
        return "text/xml";
    }

    /** Should return true if the parser implementation will support parsing the given FileStreamSummary */
    supportsFileStream(streamSummary: FileBufferSummary): boolean {
        if (
            streamSummary.detectedMimeType !== null &&
            streamSummary.detectedMimeType !== "text/xml" &&
            streamSummary.detectedMimeType !== "application/xml"
        )
            return false;
        return (
            streamSummary.detectedMimeType === "text/xml" ||
            streamSummary.detectedMimeType === "application/xml" ||
            streamSummary.reportedMimeType === "text/xml" ||
            streamSummary.reportedMimeType === "application/xml" ||
            streamSummary.fileName?.toLowerCase().endsWith(".xml") ||
            streamSummary.uri?.toLowerCase().endsWith(".xml") ||
            false
        );
    }

    /** Returns a set of parameters based on the provided uri and configuration */
    async inspectFile(
        fileStreamSummary: FileBufferSummary,
        configuration: DPMConfiguration,
        context: SourceInspectionContext
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
                    const record = recurseXMLNodes(xmlRecord);

                    const recordContext: RecordContext = {
                        record,
                        schemaSlug: schemaPrefix,
                        offset: recordIndex++
                    };

                    callback(null, recordContext);
                }
            })
        ];
    }
}

function recurseXMLNodes(xmlNodes: { [key: string]: unknown }): DPMRecord {
    const returnValue: DPMRecord = {};

    const keys = Object.keys(xmlNodes);

    for (const key of keys) {
        const property = xmlNodes[key] as Record<string, unknown>;

        const propertyKeys = Object.keys(property);

        for (const propertyKey of propertyKeys) {
            if (propertyKey === "_") {
                returnValue[key] = property._ as string;
            } else if (propertyKey === "$") {
                const attributes = property.$ as Record<string, string | boolean | number>;
                const attributeKeys = Object.keys(attributes);

                for (const attributeKey of attributeKeys) {
                    returnValue[key + "." + attributeKey] = attributes[attributeKey];
                }
            } else {
                returnValue[key] = recurseXMLNodes(property[propertyKey] as { [key: string]: unknown });
            }
        }
    }

    return returnValue as DPMRecord;
}
