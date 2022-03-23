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
import { JobContext } from "../../../task/Task";
import { Maybe } from "../../../util/Maybe";
import { StreamSetProcessingMethod } from "../../../util/StreamToSinkUtil";
import { CommitKey, Sink, SinkSupportedStreamOptions, WritableWithContext } from "../../Sink";
import { getAuthToken } from "./DecodableConnector";
import { DISPLAY_NAME, TYPE } from "./DecodableConnectorDescription";
import { fetch } from "cross-fetch";
import { SemVer } from "semver";
import { BatchingTransform } from "../../../transforms/BatchingTransform";

type DecodableConnection = {
    id: string;
    name: string;
    description: string;
    connector: string;
    type: "source" | "sink";
    stream_id: string;
    create_time: string;
    update_time: string;
    target_state: string;
    actual_state: string;
    requested_tasks: number;
    actual_tasks: number;
    last_runtime_error: {
        message: string | null;
        timestamp: string | null;
    };
};

type DecodableSchemaProperty = {
    name: string;
    type: string;
};

type DecodableSchema = Array<DecodableSchemaProperty>;

type DecodableStream = {
    id: string;
    name: string;
    description: string;
    watermark: string | null;
    create_time: string;
    update_time: string;
    schema: DecodableSchema;
};

type ListStreamsResponse = {
    next_page_token: string | null;
    items: DecodableStream[];
};

type ListConnectionsResponse = {
    next_page_token: string | null;
    items: DecodableConnection[];
};

export class DecodableSink implements Sink {
    streamIds: Map<string, string> = new Map();
    connectorIds: Map<string, string> = new Map();

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

            const decodableStreamName =
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
                        defaultValue: decodableStreamName
                    }
                ];
            }

            if (configuration["connection-name-" + schema.title] == null) {
                return [
                    {
                        type: ParameterType.Text,
                        name: "connection-name-" + schema.title,
                        configuration,
                        message: "Connection for " + schema.title + " records?",
                        defaultValue: decodableStreamName
                    }
                ];
            }

            if (this.streamIds.get(schema.title) == null) {
                const streamId = await this.getOrCreateStream(
                    schema,
                    connectionConfiguration,
                    configuration,
                    jobContext
                );
                this.streamIds.set(schema.title, streamId);
            }

            if (this.connectorIds.get(schema.title) == null) {
                const connectorId = await this.getOrCreateConnection(
                    this.streamIds.get(schema.title) as string,
                    schema,
                    connectionConfiguration,
                    configuration,
                    jobContext
                );

                this.connectorIds.set(schema.title, connectorId);
            }
        }

        return [] as Parameter[];
    }

    getSupportedStreamOptions(): SinkSupportedStreamOptions {
        return {
            streamSetProcessingMethods: [StreamSetProcessingMethod.PER_STREAM_SET],
            updateMethods: [UpdateMethod.APPEND_ONLY_LOG]
        };
    }

    async getWriteable(
        schema: Schema,
        connectionConfiguration: DPMConfiguration,
        _credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        _updateMethod: UpdateMethod,
        jobContext: JobContext
    ): Promise<WritableWithContext> {
        if (!configuration.schemaStreamNames) {
            throw new Error("Requires configuration.schemaStreamNames");
        }

        if (schema.title == null) throw new Error("Schema has no title");

        const authToken = getAuthToken();

        const connectionId = this.connectorIds.get(schema.title);

        return {
            getCommitKeys: () => {
                return [] as CommitKey[];
            },
            outputLocation: `https://${connectionConfiguration.account}.api.decodable.co/v1alpha2/streams`,
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
                    const response = await fetch(
                        `https://${connectionConfiguration.account}.api.decodable.co/v1alpha2/connections/${connectionId}/events`,
                        {
                            method: "POST",
                            headers: {
                                Authorization: `Bearer ${authToken}`,
                                "Content-Type": "application/json",
                                Accept: "application/json"
                            },
                            body: JSON.stringify({
                                events
                            })
                        }
                    );

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

    /** returns the decodable stream id */
    async getOrCreateStream(
        schema: Schema,
        connectionConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        jobContext: JobContext
    ): Promise<string> {
        const decodableStreamName = (configuration as Record<string, string>)[
            ("stream-name-" + schema.title) as string
        ];

        const task = await jobContext.startTask("Finding existing Decodable Stream for " + decodableStreamName);

        let stream: DecodableStream | undefined;

        let pageToken: string | null = null;

        while (true) {
            let url = `https://${connectionConfiguration.account}.api.decodable.co/v1alpha2/streams?page_size=100`;

            if (pageToken != null) {
                url += "&page_token=" + pageToken;
            }

            const response = await fetch(url, {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    Authorization: `Bearer ${getAuthToken()}`
                }
            });

            if (response.status !== 200) {
                throw new Error("Failed to list decodable streams: " + response.statusText);
            }

            const listStreamsResponse = (await response.json()) as ListStreamsResponse;

            stream = listStreamsResponse.items.find((s) => s.name === decodableStreamName);

            if (stream) {
                break;
            }

            if (!listStreamsResponse.next_page_token) {
                break;
            }

            pageToken = listStreamsResponse.next_page_token;
        }

        if (!stream) {
            task.setMessage("Decodable Stream " + decodableStreamName + " does not exist, creating");

            const decodableSchema = this.getDecodableSchema(schema);

            const requestBody = JSON.stringify({
                name: decodableStreamName,
                description: "Created by DataPM",
                schema: decodableSchema
            });

            const response = await fetch(
                `https://${connectionConfiguration.account}.api.decodable.co/v1alpha2/streams`,
                {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${getAuthToken()}`
                    },
                    body: requestBody
                }
            );

            if (response.status !== 201) {
                jobContext.print("INFO", "Decodable Request Body Below");
                jobContext.print("INFO", requestBody);
                throw new Error(
                    "Unable to create decodable stream. Response code: " +
                        response.status +
                        " body: " +
                        JSON.stringify(response.json())
                );
            }

            stream = (await response.json()) as DecodableStream;

            task.end("SUCCESS", "Created Decodable Stream " + decodableStreamName);
        } else {
            task.end("SUCCESS", "Found Decodable Stream " + decodableStreamName);
        }

        return stream.id;
    }

    async getOrCreateConnection(
        streamId: string,
        schema: Schema,
        connectionConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        jobContext: JobContext
    ): Promise<string> {
        let task = await jobContext.startTask("Finding existing connections");

        const decodableConnectionName = (configuration as Record<string, string>)[
            ("connection-name-" + schema.title) as string
        ];

        let connection: DecodableConnection | undefined;

        let pageToken: string | null = null;

        while (true) {
            let url = `https://${connectionConfiguration.account}.api.decodable.co/v1alpha2/connections?page_size=100`;

            if (pageToken != null) {
                url += "&page_token=" + pageToken;
            }

            const response = await fetch(url, {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    Authorization: `Bearer ${getAuthToken()}`
                }
            });

            if (response.status !== 200) {
                throw new Error("Failed to list decodable connections: " + response.statusText);
            }

            const responseJson = (await response.json()) as ListConnectionsResponse;

            connection = responseJson.items.find((c) => c.name === decodableConnectionName);

            if (connection) {
                break;
            }

            if (!responseJson.next_page_token) {
                break;
            }

            pageToken = responseJson.next_page_token;
        }

        if (!connection) {
            task.setMessage("Decodable Connection " + decodableConnectionName + " does not exist, creating");

            const decodableSchema = this.getDecodableSchema(schema);

            const response = await fetch(
                `https://${connectionConfiguration.account}.api.decodable.co/v1alpha2/connections`,
                {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${getAuthToken()}`
                    },
                    body: JSON.stringify({
                        name: decodableConnectionName,
                        description: "Created by DataPM",
                        connector: "rest",
                        type: "source",
                        stream_id: streamId,
                        schema: decodableSchema
                    })
                }
            );

            if (response.status !== 201) {
                throw new Error("Unable to create Decodable Connection: " + response.statusText);
            }

            connection = (await response.json()) as DecodableConnection;

            await task.end("SUCCESS", "Created Decodable Connection " + decodableConnectionName);
        } else {
            await task.end("SUCCESS", "Found Decodable Connection " + decodableConnectionName);
        }

        task = await jobContext.startTask(
            "Checking that Decodable Connection " + decodableConnectionName + " is active"
        );

        if (connection.target_state === "STOPPED") {
            task.setMessage("Connection " + decodableConnectionName + " is not active, starting");

            const response = await fetch(
                `https://${connectionConfiguration.account}.api.decodable.co/v1alpha2/connections/${connection.id}/activate`,
                {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        Authorization: `Bearer ${getAuthToken()}`
                    }
                }
            );

            if (response.status !== 200) {
                throw new Error("Error attempting to start Decodable Connection: " + response.statusText);
            }

            task.setMessage("Waiting for Decodable Connection " + decodableConnectionName + " to start");

            while (true) {
                const statusResponse = await fetch(
                    `https://${connectionConfiguration.account}.api.decodable.co/v1alpha2/connections/${connection.id}`,
                    {
                        method: "GET",
                        headers: {
                            Accept: "application/json",
                            Authorization: `Bearer ${getAuthToken()}`
                        }
                    }
                );

                if (statusResponse.status !== 200) {
                    throw new Error("Unable to get Decodable Connection status: " + statusResponse.statusText);
                }

                connection = (await statusResponse.json()) as DecodableConnection;

                if (connection.actual_state === "RUNNING") {
                    break;
                }
            }

            await task.end("SUCCESS", "Decodable Connection " + decodableConnectionName + " now running");
        } else {
            await task.end("SUCCESS", "Decodable Connection " + decodableConnectionName + " is already running");
        }

        return connection.id;
    }

    getDecodableSchema(schema: Schema): DecodableSchema {
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
                name: property.title,
                type: this.getDecodableType(property.type as JSONSchema7TypeName[], property.format)
            };
        });
    }

    getDecodableType(types: string[], format?: string): string {
        const removedNull = types.filter((t) => t !== "null");

        if (removedNull.length > 1) {
            throw new Error("Decodable Sink does not support schemas with more than one type");
        }

        if (removedNull.length === 0) {
            throw new Error("column has no value types");
        }

        switch (removedNull[0]) {
            case "string":
                return "STRING";
            case "integer":
                return "BIGINT";
            case "number":
                switch (format) {
                    case "float":
                        return "FLOAT";
                    case "integer":
                        return "BIGINT";
                    default:
                        return "DOUBLE";
                }
            case "boolean":
                return "BOOLEAN";
            default:
                throw new Error("Unsupported Decodable type: " + removedNull[0]);
        }
    }
}
