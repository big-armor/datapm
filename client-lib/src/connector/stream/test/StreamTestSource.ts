import { DPMConfiguration, DPMRecord, UpdateMethod, RecordContext, Parameter, ParameterType } from "datapm-lib";
import faker from "faker";
import { Readable } from "stream";
import { string } from "yargs";
import { JobContext } from "../../../task/JobContext";
import { FakerCategories, FakerTypes } from "../../../util/FakerUtil";
import { toSentenceCase } from "../../../util/NameUtil";
import { StreamSetPreview, InspectionResults, Source, StreamSummary } from "../../Source";
import { TYPE } from "./StreamTestConnectorDescription";

interface TestSourceAttribute {
    name: string;
    category: string;
    type?: string;
}

export class StreamTestSource implements Source {
    sourceType(): string {
        return TYPE;
    }

    async getInspectParameters(jobContext: JobContext, configuration: DPMConfiguration): Promise<Parameter[]> {
        if (configuration.recordCount == null) {
            await jobContext.parameterPrompt([
                {
                    type: ParameterType.Number,
                    name: "recordCount",
                    configuration,
                    message: "How many test records?",
                    defaultValue: configuration.recordCount != null ? (configuration.recordCount as number) : 10,
                    numberMinimumValue: 1
                }
            ]);
        }

        if (configuration.attributes == null) {
            let attributeCount = 0;
            const attributeNames: string[] = [];
            configuration.attributes = {};
            while (true) {
                const attributeNameResponse = await jobContext.parameterPrompt([
                    {
                        type: ParameterType.Text,
                        name: "attributeName",
                        message: "Name of attribute?",
                        configuration: {},
                        validate: (value) => {
                            if (attributeCount === 0 && !value) return "There should be at least 1 attribute";
                            if (value && attributeNames.includes(value as string)) {
                                return `'${value}' attribute is already existing`;
                            }
                            return true;
                        }
                    }
                ]);
                if (!attributeNameResponse.attributeName) {
                    break;
                }

                const attributeCategoryResponse = await jobContext.parameterPrompt([
                    {
                        type: ParameterType.AutoComplete,
                        name: "attributeCategory",
                        configuration: {},
                        message: `Category of '${attributeNameResponse.attributeName}' attribute?`,
                        options: FakerCategories.map((category) => ({
                            title: toSentenceCase(category),
                            value: category
                        }))
                    }
                ]);

                const attributeTypes = FakerTypes[attributeCategoryResponse.attributeCategory];
                let attributeType;
                if (attributeTypes.length > 0) {
                    const attributeTypeResponse = await jobContext.parameterPrompt([
                        {
                            type: ParameterType.AutoComplete,
                            name: "attributeType",
                            message: `Type of '${attributeNameResponse.attributeName}' attribute?`,
                            configuration: {},
                            options: attributeTypes.map((type) => ({
                                title: toSentenceCase(type),
                                value: type
                            }))
                        }
                    ]);
                    attributeType = attributeTypeResponse.attributeType;
                }

                configuration.attributes[attributeNameResponse.attributeName] = {
                    name: attributeNameResponse.attributeName,
                    category: attributeCategoryResponse.attributeCategory,
                    type: attributeType
                };
                attributeNames.push(attributeNameResponse.attributeName);
                attributeCount += 1;
            }
        }

        return [];
    }

    async inspectData(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        jobContext: JobContext
    ): Promise<InspectionResults> {
        await this.getInspectParameters(jobContext, configuration);

        return {
            defaultDisplayName: "Test Stream",
            source: this,
            configuration,
            streamSetPreviews: [await this.getRecordStreams(configuration, jobContext)]
        };
    }

    async getRecordStreams(configuration: DPMConfiguration, _context: JobContext): Promise<StreamSetPreview> {
        const updateHash = new Date().toString();

        const streamSummaries: StreamSummary[] = [
            {
                name: "random",
                updateMethod: UpdateMethod.BATCH_FULL_SET,
                openStream: async () => {
                    const stream = new Readable({ objectMode: true });

                    for (let i = 0; i < (configuration.recordCount as number); i += 1) {
                        const record: DPMRecord = {};
                        Object.values(configuration.attributes as { [key: string]: TestSourceAttribute }).forEach(
                            (attribute) => {
                                if (attribute.type) {
                                    /* eslint-disable  @typescript-eslint/no-explicit-any */
                                    record[attribute.name] = (faker as any)[attribute.category][attribute.type]();
                                } else {
                                    /* eslint-disable  @typescript-eslint/no-explicit-any */
                                    record[attribute.name] = (faker as any)[attribute.category]();
                                }
                            }
                        );

                        const recordContext: RecordContext = {
                            schemaSlug: "random",
                            record,
                            receivedDate: new Date()
                        };

                        stream.push(recordContext);
                    }
                    stream.push(null);
                    return {
                        name: "random",
                        stream
                    };
                }
            }
        ];

        return {
            streamSummaries,
            updateHash,
            slug: "random"
        };
    }
}
