import { DPMConfiguration, DPMRecord, UpdateMethod, RecordContext, Parameter, ParameterType } from "datapm-lib";
import faker from "faker";
import { Readable } from "stream";
import { FakerCategories, FakerTypes } from "../../util/FakerUtil";
import { toSentenceCase } from "../../util/NameUtil";
import { StreamSetPreview, SourceInspectionContext, InspectionResults, Source, StreamSummary } from "../Source";
import { TYPE } from "./StreamTestConnectorDescription";

interface TestSourceAttribute {
    name: string;
    category: string;
    type?: string;
}

interface TestSourceConfiguration {
    recordCount: number;
    attributes?: TestSourceAttribute[];
}

export class StreamTestSource implements Source {
    configuration: TestSourceConfiguration;

    sourceType(): string {
        return TYPE;
    }

    async getInspectParameters(
        context: SourceInspectionContext,
        configuration: DPMConfiguration
    ): Promise<Parameter[]> {
        this.configuration = { recordCount: 0 };
        this.configuration.attributes = [];
        const attributeNames: string[] = [];
        let attributeCount = 0;

        await context.parameterPrompt([
            {
                type: ParameterType.Number,
                name: "recordCount",
                configuration,
                message: "How many test records?",
                validate2: (value) => (value < 1 ? "Record count should be greater than 1" : true)
            }
        ]);

        while (true) {
            const attributeNameResponse = await context.parameterPrompt([
                {
                    type: ParameterType.Text,
                    name: "attributeName",
                    message: "Name of attribute?",
                    configuration: {},
                    validate2: (value) => {
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

            const attributeCategoryResponse = await context.parameterPrompt([
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
                const attributeTypeResponse = await context.parameterPrompt([
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

            this.configuration.attributes.push({
                name: attributeNameResponse.attributeName,
                category: attributeCategoryResponse.attributeCategory,
                type: attributeType
            });
            attributeNames.push(attributeNameResponse.attributeName);
            attributeCount += 1;
        }

        return [];
    }

    async inspectURIs(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        context: SourceInspectionContext
    ): Promise<InspectionResults> {
        await this.getInspectParameters(context, configuration);

        return {
            defaultDisplayName: "Test Stream",
            source: this,
            configuration,
            streamSetPreviews: [await this.getRecordStreams(configuration, context)]
        };
    }

    async getRecordStreams(
        configuration: DPMConfiguration,
        _context: SourceInspectionContext
    ): Promise<StreamSetPreview> {
        const updateHash = new Date().toString();

        const streamSummaries: StreamSummary[] = [
            {
                name: "random",
                updateMethod: UpdateMethod.BATCH_FULL_SET,
                openStream: async () => {
                    const stream = new Readable({ objectMode: true });

                    for (let i = 0; i < this.configuration.recordCount; i += 1) {
                        const record: DPMRecord = {};
                        this.configuration.attributes?.forEach((attribute) => {
                            if (attribute.type) {
                                /* eslint-disable  @typescript-eslint/no-explicit-any */
                                record[attribute.name] = (faker as any)[attribute.category][attribute.type]();
                            } else {
                                /* eslint-disable  @typescript-eslint/no-explicit-any */
                                record[attribute.name] = (faker as any)[attribute.category]();
                            }
                        });

                        const recordContext: RecordContext = {
                            schemaSlug: "random",
                            record
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
            configuration: {}, // TODO Probably not needed
            slug: "random"
        };
    }
}
