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
    ParameterType,
    ValueTypes,
    ValueTypeStatistics,
    DPMPropertyTypes,
    DPMRecord,
    Properties,
    DPMRecordValue
} from "datapm-lib";
import { Transform } from "stream";
import { JobContext } from "../../task/JobContext";
import { Maybe } from "../../util/Maybe";
import { StreamSetProcessingMethod } from "../../util/StreamToSinkUtil";
import { CommitKey, Sink, SinkSupportedStreamOptions, WritableWithContext } from "../Sink";
import { getAuthToken } from "./DecodableConnector";
import { DISPLAY_NAME, TYPE } from "./DecodableConnectorDescription";
import { fetch } from "cross-fetch";
import { SemVer } from "semver";
import { BatchingTransform } from "../../transforms/BatchingTransform";
import moment, { MomentInput } from "moment";
import { iam_v1 } from "googleapis";

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

type DecodableCreateStreamRequest = {
    name: string;
    description: string;
    watermark?: string;
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

const RECIEVE_TIME = "datapm_receive_time";

export class DecodableSink implements Sink {
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
                        defaultValue: configuration["stream-name-" + schema.title] as string
                    }
                ];
            }

            if (configuration["event-time-" + schema.title] == null) {
                const dateTimeProperties = Object.values(schema.properties ?? {}).filter((p) => {
                    const value = Object.keys(p.types ?? []);
                    return value.includes("date-time") && value.length === 1;
                });

                return [
                    {
                        type: ParameterType.Select,
                        name: "event-time-" + schema.title,
                        configuration,
                        message: "Event time for " + schema.title + "?",
                        options: [
                            {
                                title: "DataPM recieve time",
                                value: RECIEVE_TIME,
                                selected: true
                            },
                            ...dateTimeProperties.map((p) => {
                                return {
                                    title: p.title as string,
                                    value: p.title as string
                                };
                            })
                        ]
                    }
                ];
            }
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

        const streamIds: Map<string, string> = new Map();
        const connectorIds: Map<string, string> = new Map();

        if (streamIds.get(schema.title) == null) {
            const streamId = await this.getOrCreateStream(
                schema,
                connectionConfiguration,
                credentialsConfiguration,
                configuration,
                jobContext
            );
            streamIds.set(schema.title, streamId);
        }

        if (connectorIds.get(schema.title) == null) {
            const connectorId = await this.getOrCreateConnection(
                streamIds.get(schema.title) as string,
                schema,
                connectionConfiguration,
                credentialsConfiguration,
                configuration,
                jobContext
            );

            connectorIds.set(schema.title, connectorId);
        }

        const connectionId = connectorIds.get(schema.title);

        return {
            getCommitKeys: () => {
                return [] as CommitKey[];
            },
            outputLocation: `https://${connectionConfiguration.account}.api.decodable.co/v1alpha2/streams`,
            lastOffset: undefined,
            transforms: [new BatchingTransform(1, 100)],
            writable: new Transform({
                objectMode: true,
                transform: async (
                    records: RecordStreamContext[],
                    _encoding: string,
                    callback: (error?: Error | null, data?: RecordStreamContext) => void
                ) => {
                    const events = records.map((r) => {
                        const record = r.recordContext.record;
                        if (configuration["event-time-" + schema.title] === RECIEVE_TIME) {
                            record[RECIEVE_TIME] = r.recordContext.receivedDate.toISOString();
                        }

                        return record;
                    });

                    for (const event of events) {
                        makeDecodableSafeObjects(schema.properties, event);
                    }

                    const body = JSON.stringify({
                        events
                    });

                    const response = await fetch(
                        `https://${connectionConfiguration.account}.api.decodable.co/v1alpha2/connections/${connectionId}/events`,
                        {
                            method: "POST",
                            headers: {
                                Authorization: `Bearer ${authToken}`,
                                "Content-Type": "application/json",
                                Accept: "application/json"
                            },
                            body
                        }
                    );

                    if (response.status !== 202) {
                        const jsonText = await response.json();

                        callback(
                            new Error(`Unexpected response status ${response.status} body ${JSON.stringify(jsonText)}`)
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
        credentialsConfiguration: DPMConfiguration,
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
                    Authorization: `Bearer ${getAuthToken(credentialsConfiguration)}`
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

            const decodableSchema = this.getDecodableSchema(schema, configuration);

            const createStream: DecodableCreateStreamRequest = {
                name: decodableStreamName,
                description: "Created by DataPM",
                schema: decodableSchema
            };

            if (configuration["event-time-" + schema.title] != null) {
                const waterMarkField = configuration["event-time-" + schema.title] as string;
                createStream.watermark = "`" + waterMarkField + "` AS `" + waterMarkField + "`";
            }

            const requestBody = JSON.stringify(createStream);

            const response = await fetch(
                `https://${connectionConfiguration.account}.api.decodable.co/v1alpha2/streams`,
                {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${getAuthToken(credentialsConfiguration)}`
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
                        JSON.stringify(response.text())
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
        credentialsConfiguration: DPMConfiguration,
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
                    Authorization: `Bearer ${getAuthToken(credentialsConfiguration)}`
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

            const decodableSchema = this.getDecodableSchema(schema, configuration);

            const response = await fetch(
                `https://${connectionConfiguration.account}.api.decodable.co/v1alpha2/connections`,
                {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${getAuthToken(credentialsConfiguration)}`
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
                        Authorization: `Bearer ${getAuthToken(credentialsConfiguration)}`
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
                            Authorization: `Bearer ${getAuthToken(credentialsConfiguration)}`
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

    getDecodableSchema(schema: Schema, configuration: DPMConfiguration): DecodableSchema {
        if (schema.properties == null) {
            throw new Error("Schema must have properties");
        }

        const decodableSchema = Object.keys(schema.properties).map((propertyName) => {
            const property = schema.properties?.[propertyName];

            if (property == null) {
                throw new Error("Schema property " + propertyName + " is not found");
            }

            if (property.title == null) {
                throw new Error("Schema property " + propertyName + " must have a title");
            }

            return {
                name: property.title,
                type: getDecodableType(property.types)
            };
        });

        if (configuration["event-time-" + schema.title] === RECIEVE_TIME) {
            decodableSchema.push({
                name: RECIEVE_TIME,
                type: "TIMESTAMP_LTZ(3)"
            });
        }

        return decodableSchema;
    }
}

function makeDecodableSafeObjects(properties: Properties, object: DPMRecord): void {
    for (const key of Object.keys(properties)) {
        const property = properties[key];

        if (property == null) {
            throw new Error("Schema property " + key + " is not found");
        }

        if (property.title == null) {
            throw new Error("Schema property " + key + " must have a title");
        }

        if (object[property.title] === undefined) {
            object[property.title] = null;
            continue;
        }

        const removedNull = Object.keys(property.types).filter((t) => t !== "null");

        if (removedNull.length > 1) {
            throw new Error("Decodable Sink does not support schemas with more than one type");
        }

        if (removedNull.length === 0) {
            throw new Error("column has no value types");
        }

        const type = removedNull[0];

        if (type === "object") {
            const valueType = property.types.object;

            makeDecodableSafeObjects(valueType?.objectProperties as Properties, object[property.title] as DPMRecord);
        }

        if (type === "array") {
            const valueType = property.types.array;

            if (valueType?.arrayTypes?.object != null) {
                for (const arrayValue of object[property.title] as Array<DPMRecord>) {
                    makeDecodableSafeObjects(valueType?.arrayTypes?.object.objectProperties as Properties, arrayValue);
                }
            }
        }

        if (type === "date-time") {
            const value = object[property.title];
            const momentValue = moment(value as MomentInput);

            object[property.title] = momentValue.toISOString();
        }

        if (type === "date") {
            // YYYY-MM-DD
            const value = object[property.title];
            const momentValue = moment(value as MomentInput);

            object[property.title] = momentValue.format(moment.HTML5_FMT.DATE);
        }
    }
}

export function getDecodableType(types: ValueTypes): string {
    const removedNull = Object.keys(types).filter((t) => t !== "null");

    if (removedNull.length > 1) {
        throw new Error("Decodable Sink does not support schemas with more than one type");
    }

    if (removedNull.length === 0) {
        throw new Error("column has no value types");
    }

    const type = removedNull[0];
    const valueStats = types[type as DPMPropertyTypes] as ValueTypeStatistics;

    if (valueStats == null) throw new Error("type " + type + " has no statistics");

    if (type === "string") {
        return "STRING";
    }

    if (type === "number") {
        // TODO support Double vs. Decimal decision
        // by comparing max and min value range vs
        // scale of the number to determine if they would
        // be outside the range of Decimal (exact). Could
        // then use double (approximate)
        const scale = types[type]?.numberMaxScale ?? 0;
        const precision = 31;
        return `DECIMAL(${precision},${scale})`;
    }

    if (type === "integer") {
        return "BIGINT";
    }

    if (type === "boolean") {
        return "BOOLEAN";
    }

    if (type === "date") {
        return "DATE";
    }

    if (type === "date-time") {
        // Currently sets to TIMESTAMP_LTZ(3) because
        // upstream processing converts to javascript Date
        // object, which automatically truncates to 3 digits
        return "TIMESTAMP_LTZ(3)";
    }

    if (type === "array") {
        if (valueStats.arrayTypes == null) throw new Error("array type has no defined array types");

        return "ARRAY<" + getDecodableType(valueStats.arrayTypes) + ">";
    }

    if (type === "object") {
        if (valueStats.objectProperties == null) throw new Error("object type has no defined properties");

        let propertiesString = "ROW(";

        const keys = Object.keys(valueStats.objectProperties);

        for (let i = 0; i < keys.length; i++) {
            const propertyKey = keys[i];
            const property = valueStats.objectProperties[propertyKey];
            const typeString = getDecodableType(property.types);

            propertiesString += `${propertyKey} ${typeString}`;

            // if (property.description != null) propertiesString += `'${property.description}'`;

            if (i < keys.length - 1) propertiesString += ", ";
        }

        propertiesString += ")";

        return propertiesString;
    }

    throw new Error("Unsupported type for Decodable Sink: " + removedNull[0]);
}
