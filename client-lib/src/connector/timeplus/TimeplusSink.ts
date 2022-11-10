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
    DPMPropertyTypes,
    DPMRecordValue
} from "datapm-lib";
import { Transform } from "stream";
import { JobContext } from "../../task/JobContext";
import { Maybe } from "../../util/Maybe";
import { StreamSetProcessingMethod } from "../../util/StreamToSinkUtil";
import { CommitKey, Sink, SinkSupportedStreamOptions, WritableWithContext } from "../Sink";
import { getApiKey } from "./TimeplusConnector";
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
    columnTypeCache: Map<string, string>;
    hiddenColumns: Array<string>;

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

        const apiKey = getApiKey(credentialsConfiguration);

        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const that = this;

        return {
            getCommitKeys: () => {
                return [] as CommitKey[];
            },
            outputLocation: `${connectionConfiguration.base}/api/v1beta1/streams`,
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
                    const rows: DPMRecordValue[][] = [];
                    for (let i = 0; i < events.length; i++) {
                        const event: DPMRecord = events[i];
                        const row = [];
                        for (const key of keys) {
                            const columnName = key;
                            if (that.hiddenColumns.includes(columnName)) continue;
                            const columnValue = event[key];
                            if (i === 0) {
                                columns.push(columnName);
                            }
                            if (columnValue == null) {
                                row.push(" "); // set an empty string if the value is null
                            } else if (typeof columnValue === "object" && !(columnValue instanceof Date)) {
                                const str = JSON.stringify(columnValue);
                                if (str === "{}") {
                                    row.push(" "); // set an empty string if the value is an empty json object
                                } else {
                                    row.push(str);
                                }
                                // if (that.columnTypeCache.get(columnName) === "json")
                            } else {
                                row.push(columnValue);
                            }
                        }
                        rows.push(row);
                    }
                    const data = {
                        columns: columns,
                        data: rows
                    };
                    const bodyStr = JSON.stringify(data);
                    const ingestURL = `${connectionConfiguration.base}/api/v1beta1/streams/${
                        configuration["stream-name-" + schema.title]
                    }/ingest`;
                    const response = await fetch(ingestURL, {
                        method: "POST",
                        headers: {
                            "X-Api-Key": apiKey,
                            "Content-Type": "application/json",
                            Accept: "application/json" // don't use application/x-ndjson, because the batch mode is more performant
                        },
                        body: bodyStr
                    });

                    // shall we use 202?
                    if (response.status !== 200) {
                        const msg = `Unexpected response status ${response.status} body ${await response.text()}`;
                        jobContext.print("WARN", `Fail to ingest data in batch, with error message: ${msg}`);
                        // console.log(bodyStr);
                        // callback(new Error(msg));
                        // return;
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

        const url = `${connectionConfiguration.base}/api/v1beta1/streams`;

        const apiKey = getApiKey(credentialsConfiguration);

        const response = await fetch(url, {
            method: "GET",
            headers: {
                Accept: "application/json",
                "X-Api-Key": apiKey
            }
        });

        if (response.status !== 200) {
            throw new Error(`Failed to list Timeplus streams. HTTP code: ${response.status} ${response.statusText}`);
        }
        const rv = await response.json();
        const listStreamsResponse = rv as ListStreamsResponse;

        stream = listStreamsResponse.find((s) => s.name === timeplusStreamName);

        const timeplusColumns = this.getTimeplusColumns(schema);

        if (!stream) {
            task.setMessage("Timeplus Stream " + timeplusStreamName + " does not exist, creating");

            const requestBody = JSON.stringify({
                name: timeplusStreamName,
                // description: "Created by DataPM",
                columns: timeplusColumns
            });

            const response = await fetch(`${connectionConfiguration.base}/api/v1beta1/streams`, {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    "X-Api-Key": apiKey
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

        const rv: TimeplusColumns = [];
        this.columnTypeCache = new Map<string, string>();
        this.hiddenColumns = new Array<string>();
        for (const propertyName of Object.keys(schema.properties)) {
            const property = schema.properties?.[propertyName];

            if (property == null) {
                throw new Error("Schema property " + propertyName + " is not found");
            }

            if (property.hidden === true) {
                // the user can exclude files
                this.hiddenColumns.push(property.title);
            } else {
                const type = this.getTimeplusType(Object.keys(property.types) as DPMPropertyTypes[]);
                this.columnTypeCache.set(property.title, type);
                rv.push({
                    name: property.title,
                    type: type
                });
            }
        }
        return rv;
    }

    getTimeplusType(types: DPMPropertyTypes[]): string {
        const removedNull = types.filter((t) => t !== "null");

        if (removedNull.length > 1) {
            // when integer and string both possible, choose string
            if (removedNull.includes("string")) {
                return "string";
            }
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
            case "date-time":
                return "datetime64";
            case "object":
                return "string"; // use 'string' for more flexible schemas. 'json' type for index-time json extraction (fixed schema, cannot be null)
            case "array":
                return "string"; // need further test
            default:
                throw new Error("Unsupported Timeplus type: " + removedNull[0]);
        }
    }
}
