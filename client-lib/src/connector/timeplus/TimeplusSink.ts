/* eslint-disable camelcase */
import {
    DPMConfiguration,
    PackageFile,
    Parameter,
    SinkState,
    Schema,
    UpdateMethod,
    SinkStateKey,
    SchemaIdentifier,
    RecordStreamContext,
    ParameterType
} from "datapm-lib";
import { JSONSchema7TypeName } from "json-schema";
import { Transform } from "stream";
import { JobContext } from "../../task/Task";
import { Maybe } from "../../util/Maybe";
import { StreamSetProcessingMethod } from "../../util/StreamToSinkUtil";
import { CommitKey, Sink, SinkSupportedStreamOptions, WritableWithContext } from "../Sink";
import { getAuthToken } from "./TimeplusConnector";
import { DISPLAY_NAME, TYPE } from "./TimeplusConnectorDescription";
import { fetch } from "cross-fetch";
import { SemVer } from "semver";
import { BatchingTransform } from "../../transforms/BatchingTransform";

type TimeplusColumn = {
    name: string;
    type: string;
    // nullable
    // default
    // alias
    // comment
};

type TimeplusColumns = Array<TimeplusColumn>;

type TimeplusStream = {
    name: string;
    // engine: string;
    // ttl: string;
    columns: TimeplusColumns;
};

type ListStreamsResponse = Array<TimeplusStream>;

export class TimeplusSink implements Sink {
    activeStream: string;
    // streamIds: Map<string, string> = new Map();
    // connectorIds: Map<string, string> = new Map();

    getType(): string {
        return TYPE;
    }

    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    isStronglyTyped(): boolean | Promise<boolean> {
        return true;
    }

    async getParameters(
        catalogSlug: string | undefined,
        packageFile: PackageFile,
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        jobContext: JobContext
    ): Promise<Parameter[]> {
        configuration.schemaStreamNames = {};

        for (const schema of packageFile.schemas) {
            if (schema.title == null) throw new Error("Schema has no title");

            const schemaReference: SchemaIdentifier = {
                registryUrl: "",
                catalogSlug: catalogSlug as string,
                packageSlug: packageFile.packageSlug as string,
                majorVersion: new SemVer(packageFile.version).major,
                schemaTitle: schema.title as string
            };

            const TimeplusStreamName =
                schemaReference.catalogSlug +
                "_" +
                schemaReference.packageSlug +
                "_" +
                schemaReference.majorVersion +
                "_" +
                schemaReference.schemaTitle;

            if (configuration["stream-name-" + schema.title] == null) {
                return [
                    {
                        type: ParameterType.Text,
                        name: "stream-name-" + schema.title,
                        configuration,
                        message: "Stream for " + schema.title + " records?",
                        defaultValue: TimeplusStreamName
                    }
                ];
            }

            await this.getOrCreateStream(
                schema,
                connectionConfiguration,
                credentialsConfiguration,
                configuration,
                jobContext
            );
        }

        return [] as Parameter[];
    }

    getSupportedStreamOptions(): SinkSupportedStreamOptions {
        return {
            streamSetProcessingMethods: [StreamSetProcessingMethod.PER_STREAM_SET],
            updateMethods: [UpdateMethod.APPEND_ONLY_LOG, UpdateMethod.CONTINUOUS]
        };
    }

    async getWriteable(
        schema: Schema,
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        _updateMethod: UpdateMethod,
        replaceExistingData: boolean,
        jobContext: JobContext
    ): Promise<WritableWithContext> {
        if (!configuration.schemaStreamNames) {
            throw new Error("Requires configuration.schemaStreamNames");
        }

        if (schema.title == null) throw new Error("Schema has no title");

        const authToken = getAuthToken(credentialsConfiguration);

        return {
            getCommitKeys: () => {
                return [] as CommitKey[];
            },
            outputLocation: `https://${connectionConfiguration.host}/api/v1beta1/streams`,
            lastOffset: undefined,
            transforms: [new BatchingTransform(100, 100)],
            writable: new Transform({
                objectMode: true,
                transform: async (
                    records: RecordStreamContext[],
                    _encoding: string,
                    callback: (error?: Error | null, data?: RecordStreamContext) => void
                ) => {
                    const events = records.map((r) => r.recordContext.record);
                    const ingestURL = `https://${connectionConfiguration.host}/api/v1beta1/${
                        configuration["stream-name-" + schema.title]
                    }/ingest`;
                    jobContext.print("INFO", ` ingestURL: ${ingestURL}`);
                    const response = await fetch(ingestURL, {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${authToken}`,
                            "Content-Type": "application/json",
                            Accept: "application/json"
                        },
                        body: JSON.stringify({
                            events
                        })
                    });

                    if (response.status !== 202) {
                        callback(
                            new Error(
                                `Unexpected response status ${response.status} body ${JSON.stringify(response.json())}`
                            )
                        );
                        return;
                    }

                    callback(null, records[records.length - 1]);
                }
            })
        };
    }

    async commitAfterWrites(
        _connectionConfiguration: DPMConfiguration,
        _credentialsConfiguration: DPMConfiguration,
        _configuration: DPMConfiguration,
        _commitKeys: CommitKey[],
        _sinkStateKey: SinkStateKey,
        _sinkState: SinkState,
        _jobContext: JobContext
    ): Promise<void> {
        // TODO save the sink state
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    filterDefaultConfigValues(): void {}

    async getSinkState(
        _connectionConfiguration: DPMConfiguration,
        _credentialsConfiguration: DPMConfiguration,
        _configuration: DPMConfiguration,
        _sinkStateKey: SinkStateKey,
        _jobContext: JobContext
    ): Promise<Maybe<SinkState>> {
        // TODO get the sink state
        return null;
    }

    /** returns the Timeplus stream id */
    async getOrCreateStream(
        schema: Schema,
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        jobContext: JobContext
    ): Promise<void> {
        const timeplusStreamName = (configuration as Record<string, string>)[("stream-name-" + schema.title) as string];

        const task = await jobContext.startTask("Finding existing Timeplus Stream for " + timeplusStreamName);

        let stream: TimeplusStream | undefined;

        while (true) {
            const url = `https://${connectionConfiguration.host}/api/v1beta1/streams`;
            jobContext.print("INFO", "Sending GET to " + url);

            const response = await fetch(url, {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    Authorization: `Bearer ${getAuthToken(credentialsConfiguration)}`
                }
            });
            const rv = await response.json();
            jobContext.print("INFO", "Got response with HTTP code " + response.status);

            if (response.status !== 200) {
                throw new Error("Failed to list Timeplus streams: " + response.statusText);
            }

            const listStreamsResponse = rv as ListStreamsResponse;

            stream = listStreamsResponse.find((s) => s.name === timeplusStreamName);

            if (stream) {
                break;
            }
        }

        if (!stream) {
            task.setMessage("Timeplus Stream " + timeplusStreamName + " does not exist, creating");

            const timeplusColumns = this.getTimeplusColumns(schema);

            const requestBody = JSON.stringify({
                name: timeplusStreamName,
                // description: "Created by DataPM",
                columns: timeplusColumns
            });

            const response = await fetch(`https://${connectionConfiguration.host}/api/v1beta1/streams`, {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${getAuthToken(credentialsConfiguration)}`
                },
                body: requestBody
            });

            if (response.status !== 201) {
                jobContext.print("INFO", "Timeplus Request Body Below");
                jobContext.print("INFO", requestBody);
                throw new Error(
                    "Unable to create Timeplus stream. Response code: " +
                        response.status +
                        " body: " +
                        JSON.stringify(response.json())
                );
            }

            stream = (await response.json()) as TimeplusStream;

            task.end("SUCCESS", "Created Timeplus Stream " + timeplusStreamName);
        } else {
            task.end("SUCCESS", "Found Timeplus Stream " + timeplusStreamName);
        }
    }

    getTimeplusColumns(schema: Schema): TimeplusColumns {
        if (schema.properties == null) {
            throw new Error("Schema must have properties");
        }

        return Object.keys(schema.properties).map((propertyName) => {
            const property = schema.properties?.[propertyName];

            if (property == null) {
                throw new Error("Schema property " + propertyName + " is not found");
            }

            if (property.title == null) {
                throw new Error("Schema property " + propertyName + " must have a title");
            }

            return {
                // column definition
                name: property.title,
                type: this.getTimeplusType(property.type as JSONSchema7TypeName[], property.format)
            };
        });
    }

    getTimeplusType(types: string[], format?: string): string {
        const removedNull = types.filter((t) => t !== "null");

        if (removedNull.length > 1) {
            throw new Error("Timeplus Sink does not support schemas with more than one type");
        }

        if (removedNull.length === 0) {
            throw new Error("column has no value types");
        }

        switch (removedNull[0]) {
            case "string":
                return "string";
            case "integer":
                return "int";
            case "number":
                switch (format) {
                    case "float":
                        return "float";
                    case "integer":
                        return "int";
                    default:
                        return "double";
                }
            case "boolean":
                return "bool";
            default:
                throw new Error("Unsupported Timeplus type: " + removedNull[0]);
        }
    }
}
