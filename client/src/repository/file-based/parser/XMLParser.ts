import { DPMConfiguration, DPMRecord, RecordContext, UpdateMethod } from "datapm-lib";
import { Transform } from "stream";
import { SourceInspectionContext } from "../../Source";
import { FileBufferSummary, ParserInspectionResults, Parser } from "./Parser";

import XmlParser from "xml-streamer";
import { ParameterType } from "../../../util/parameters/Parameter";
import { DISPLAY_NAME, MIME_TYPE } from "./XMLParserDescription";

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
