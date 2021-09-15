import { DPMConfiguration, DPMRecord } from "datapm-lib";
import faker from "faker";
import prompts from "prompts";
import { Readable } from "stream";
import { FakerCategories, FakerTypes } from "../../util/FakerUtil";
import { toSentenceCase } from "../../util/NameUtil";
import { Parameter } from "../../util/parameters/Parameter";
import {
    StreamSetPreview,
    SourceInspectionContext,
    InspectionResults,
    Source,
    StreamSummary,
    UpdateMethod,
    RecordContext
} from "../Source";
import { TYPE } from "./StreamTestRepositoryDescription";

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

    async getInspectParameters(_configuration: DPMConfiguration): Promise<Parameter[]> {
        this.configuration = { recordCount: 0 };
        this.configuration.attributes = [];
        const attributeNames: string[] = [];
        let attributeCount = 0;

        const recordCountResponse = await prompts([
            {
                type: "number",
                name: "recordCount",
                message: "How many test records?",
                validate: (value) => (value < 1 ? "Record count should be greater than 1" : true)
            }
        ]);
        this.configuration.recordCount = recordCountResponse.recordCount;

        while (true) {
            const attributeNameResponse = await prompts([
                {
                    type: "text",
                    name: "attributeName",
                    message: "Name of attribute?",
                    validate: (value) => {
                        if (attributeCount === 0 && !value) return "There should be at least 1 attribute";
                        if (value && attributeNames.includes(value)) {
                            return `'${value}' attribute is already existing`;
                        }
                        return true;
                    }
                }
            ]);
            if (!attributeNameResponse.attributeName) {
                break;
            }

            const attributeCategoryResponse = await prompts([
                {
                    type: "autocomplete",
                    name: "attributeCategory",
                    message: `Category of '${attributeNameResponse.attributeName}' attribute?`,
                    choices: FakerCategories.map((category) => ({
                        title: toSentenceCase(category),
                        value: category
                    }))
                }
            ]);

            const attributeTypes = FakerTypes[attributeCategoryResponse.attributeCategory];
            let attributeType;
            if (attributeTypes.length > 0) {
                const attributeTypeResponse = await prompts([
                    {
                        type: "autocomplete",
                        name: "attributeType",
                        message: `Type of '${attributeNameResponse.attributeName}' attribute?`,
                        choices: attributeTypes.map((type) => ({
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
        await this.getInspectParameters(configuration);

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
            supportedUpdateMethods: [UpdateMethod.BATCH_FULL_SET],
            updateHash,
            configuration: {}, // TODO Probably not needed
            slug: "random"
        };
    }
}
