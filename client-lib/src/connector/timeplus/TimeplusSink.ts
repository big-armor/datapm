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
    DPMRecord,
    DPMPropertyTypes
} from "datapm-lib";
import { Transform } from "stream";
import { JobContext } from "../../task/JobContext";
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
};

type TimeplusColumns = Array<TimeplusColumn>;

type TimeplusStream = {
    name: string;
    columns: TimeplusColumns;
};

type ListStreamsResponse = Array<TimeplusStream>;

export class TimeplusSink implements Sink {
    activeStream: string;

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
            updateMethods: [UpdateMethod.APPEND_ONLY_LOG, UpdateMethod.CONTINUOUS, UpdateMethod.BATCH_FULL_SET]
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

        if (schema.properties == null) throw new Error("Schema properties not definied, and are required");
        const keys = Object.keys(schema.properties);

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

                    const columns: string[] = [];
                    const rows: (string | undefined)[][] = [];
                    for (let i = 0; i < events.length; i++) {
                        const event: DPMRecord = events[i];
                        const row = [];
                        for (const key of keys) {
                            const columnName = key;
                            const columnValue = event[key];
                            if (i === 0) {
                                columns.push(columnName);
                            }
                            row.push(columnValue?.toString());
                        }
                        rows.push(row);
                    }
                    const data = {
                        columns: columns,
                        data: rows
                    };
                    const ingestURL = `https://${connectionConfiguration.host}/api/v1beta1/streams/${
                        configuration["stream-name-" + schema.title]
                    }/ingest`;
                    // jobContext.print("INFO", `ingestURL: ${ingestURL}`);
                    const response = await fetch(ingestURL, {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${authToken}`,
                            "Content-Type": "application/json",
                            Accept: "application/json"
                        },
                        body: JSON.stringify(data)
                    });

                    // shall we use 202?
                    if (response.status !== 200) {
                        callback(
                            new Error(`Unexpected response status ${response.status} body ${await response.text()}`)
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

        const url = `https://${connectionConfiguration.host}/api/v1beta1/streams`;
        // jobContext.print("INFO", "Sending GET to " + url);

        const response = await fetch(url, {
            method: "GET",
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${getAuthToken(credentialsConfiguration)}`
            }
        });
        // jobContext.print("INFO", "Got response with HTTP code " + response.status);

        if (response.status !== 200) {
            throw new Error(`Failed to list Timeplus streams. HTTP code: ${response.status} ${response.statusText}`);
        }
        const rv = await response.json();
        const listStreamsResponse = rv as ListStreamsResponse;

        stream = listStreamsResponse.find((s) => s.name === timeplusStreamName);

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
                // jobContext.print("INFO", "Timeplus Request Body Below");
                // jobContext.print("INFO", requestBody);
                throw new Error(
                    "Unable to create Timeplus stream. Response code: " + response.status + " body: " + response.text()
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
            // console.log("[debug] propertyName:" + propertyName + " property:" + JSON.stringify(property));

            if (property == null) {
                throw new Error("Schema property " + propertyName + " is not found");
            }

            return {
                // column definition
                name: property.title,
                type: this.getTimeplusType(Object.keys(property.types) as DPMPropertyTypes[])
            };
        });
    }

    getTimeplusType(types: DPMPropertyTypes[]): string {
        // console.log("[debug] type:" + types + " format:" + format);
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
                return "double";
            case "boolean":
                return "bool";
            default:
                throw new Error("Unsupported Timeplus type: " + removedNull[0]);
        }
    }
}
