import {
    DPMConfiguration,
    PackageFile,
    Parameter,
    SinkState,
    Schema,
    UpdateMethod,
    SinkStateKey,
    ParameterType,
    RecordStreamContext
} from "datapm-lib";
import { JobContext } from "../../../task/JobContext";
import { Maybe } from "../../../util/Maybe";
import { StreamSetProcessingMethod } from "../../../util/StreamToSinkUtil";
import { CommitKey, Sink, SinkSupportedStreamOptions, WritableWithContext } from "../../Sink";
import { DISPLAY_NAME, TYPE } from "./KafkaConnectorDescription";
import { Kafka, Message } from "kafkajs";
import { Transform, TransformCallback } from "stream";
import { BatchingTransform } from "../../../transforms/BatchingTransform";

export class KafkaSink implements Sink {
    getType(): string {
        return TYPE;
    }

    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    isStronglyTyped(configuration: DPMConfiguration): boolean | Promise<boolean> {
        return false; // Maybe it should be with a Confluent registry?
    }

    getParameters(
        catalogSlug: string | undefined,
        schema: PackageFile,
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        jobContext: JobContext
    ): Parameter<string>[] | Promise<Parameter<string>[]> {
        if (configuration.clientId == null) {
            return [
                {
                    configuration,
                    name: "clientId",
                    type: ParameterType.Text,
                    message: "Client Id?",
                    defaultValue: "datapm",
                    stringMinimumLength: 1
                }
            ];
        }

        if (configuration.topic == null) {
            return [
                {
                    configuration,
                    message: "Topic?",
                    name: "topic",
                    type: ParameterType.Text,
                    stringMinimumLength: 1,
                    defaultValue: (catalogSlug ? catalogSlug + "_" : "") + schema.packageSlug + "_{schemaTitle}"
                }
            ];
        }

        if (configuration.createTopics == null) {
            return [
                {
                    configuration,
                    message: "Create topics?",
                    name: "createTopics",
                    type: ParameterType.Select,
                    options: [
                        {
                            title: "Yes",
                            value: true
                        },
                        {
                            title: "No",
                            value: false
                        }
                    ]
                }
            ];
        }

        if (configuration.createTopics === true) {
            if (configuration.numParitions == null) {
                return [
                    {
                        configuration,
                        message: "Number of partitions?",
                        name: "numParitions",
                        type: ParameterType.Number,
                        numberMinimumValue: 1,
                        defaultValue: 1
                    }
                ];
            }

            if (configuration.replicationFactor == null) {
                return [
                    {
                        configuration,
                        message: "Replication factor?",
                        name: "replicationFactor",
                        type: ParameterType.Number,
                        numberMinimumValue: 1,
                        defaultValue: 1
                    }
                ];
            }
        }

        if (configuration.maxBatchSize == null) {
            return [
                {
                    name: "maxBatchSize",
                    message: "Max batch size?",
                    type: ParameterType.Number,
                    numberMinimumValue: 1,
                    defaultValue: 100,
                    configuration
                }
            ];
        }

        if (configuration.maxBatchWaitMs == null) {
            return [
                {
                    name: "maxBatchWaitMs",
                    message: "Max batch wait milliseconds?",
                    type: ParameterType.Number,
                    numberMinimumValue: 1,
                    defaultValue: 100,
                    configuration
                }
            ];
        }

        if (configuration.format == null) {
            return [
                {
                    name: "format",
                    message: "Format?",
                    configuration: configuration,
                    type: ParameterType.Select,
                    options: [
                        {
                            title: "JSON",
                            value: "json"
                        } /*,
                        {
                            title: "Avro",
                            value: "avro"
                        } */
                    ]
                }
            ];
        }

        // TODO implement partitioning strategy, using round robin, property key/value, or hash

        return [];
    }

    getSupportedStreamOptions(
        configuration: DPMConfiguration,
        sinkState: Maybe<SinkState>
    ): SinkSupportedStreamOptions {
        return {
            updateMethods: [UpdateMethod.APPEND_ONLY_LOG, UpdateMethod.BATCH_FULL_SET, UpdateMethod.CONTINUOUS],
            streamSetProcessingMethods: [StreamSetProcessingMethod.PER_STREAM]
        };
    }

    async getWriteable(
        schema: Schema,
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        updateMethod: UpdateMethod,
        replaceExistingData: boolean,
        jobContext: JobContext
    ): Promise<WritableWithContext> {
        if (typeof connectionConfiguration.brokers !== "string") {
            throw new Error("Brokers must be a string");
        }

        if (typeof configuration.topic !== "string") {
            throw new Error("Topic missing from configuration");
        }

        if (typeof configuration.clientId !== "string") {
            throw new Error("Client Id missing from configuration");
        }

        if (typeof schema.title !== "string") {
            throw new Error("Schema title must be a string");
        }

        const brokers = connectionConfiguration.brokers
            .split(",")
            .map((s) => s.trim())
            .sort();

        const topic = configuration.topic.replace("{schemaTitle}", schema.title);

        const kafka = new Kafka({
            brokers,
            clientId: configuration.clientId,
            ssl: connectionConfiguration.useSsl === true,
            sasl:
                credentialsConfiguration.authenticationMechanism === "plain"
                    ? {
                          mechanism: "plain",
                          username: credentialsConfiguration.username as string,
                          password: credentialsConfiguration.password as string
                      }
                    : undefined
        });

        if (configuration.createTopics === true) {
            if (typeof configuration.numParitions !== "number") {
                throw new Error("Number of partitions must be a number");
            }

            if (typeof configuration.replicationFactor !== "number") {
                throw new Error("Replication factor must be a number");
            }

            const existingTopics = await kafka.admin().listTopics();
            if (!existingTopics.includes(topic)) {
                try {
                    await kafka.admin().createTopics({
                        topics: [
                            {
                                topic,
                                numPartitions: configuration.numParitions,
                                replicationFactor: configuration.replicationFactor
                            }
                        ]
                    });
                } catch (error) {
                    jobContext.print("ERROR", "Error while creating topic: " + error.message);

                    if (error.errors && error.errors.length > 0) {
                        for (const err of error.errors as { message: string }[]) {
                            jobContext.print("ERROR", err.message);
                        }
                    }
                    console.log(JSON.stringify(error));
                    throw error;
                }
            }
        }

        const kafkaProducer = kafka.producer({
            allowAutoTopicCreation: true //* This will not honor the partitions config settings, but will fail less
        });

        await kafkaProducer.connect();

        const writable = new Transform({
            objectMode: true,
            async transform(chunk: RecordStreamContext[], encoding, callback: TransformCallback) {
                await kafkaProducer.send({
                    topic,
                    messages: chunk.map<Message>((c) => {
                        return {
                            value: JSON.stringify(c.recordContext.record)
                        };
                    })
                });

                callback(null, chunk[chunk.length - 1]);
            }
        });

        writable.on("close", () => {
            kafkaProducer.disconnect();
        });

        return {
            outputLocation: "kafka://" + brokers[0] + "/" + topic,
            writable,
            getCommitKeys: () => [],
            transforms: [
                new BatchingTransform(configuration.maxBatchSize as number, configuration.maxBatchWaitMs as number)
            ]
        };
    }

    async commitAfterWrites(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        commitKeys: CommitKey[],
        sinkStateKey: SinkStateKey,
        sinkState: SinkState,
        jobContext: JobContext
    ): Promise<void> {
        // do nothing
    }

    filterDefaultConfigValues(
        catalogSlug: string | undefined,
        packageFile: PackageFile,
        configuration: DPMConfiguration
    ): void {
        // do nothing
    }

    async getSinkState(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        SinkStateKey: SinkStateKey,
        jobContext: JobContext
    ): Promise<Maybe<SinkState>> {
        return null; // TODO implement with offsets, or save state elsewhere
    }
}
