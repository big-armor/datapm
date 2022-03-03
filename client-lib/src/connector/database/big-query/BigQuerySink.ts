import {
    SinkState,
    SinkStateKey,
    DPMConfiguration,
    DPMRecordValue,
    PackageFile,
    Schema,
    UpdateMethod,
    RecordStreamContext,
    Parameter,
    ParameterType
} from "datapm-lib";
import fs from "fs";
import { BigQuery, TableField } from "@google-cloud/bigquery";
import moment from "moment";
import { SemVer } from "semver";
import { Transform } from "stream";
import { Maybe } from "../../../util/Maybe";
import { ExtendedJSONSchema7TypeName } from "../../Source";
import { convertValueByValueType, discoverValueType } from "../../../transforms/StatsTransform";
import { CommitKey, Sink, SinkSupportedStreamOptions, WritableWithContext } from "../../Sink";
import { StreamSetProcessingMethod } from "../../../util/StreamToSinkUtil";
import { DISPLAY_NAME, TYPE } from "./BigQueryConnectorDescription";

export class BigQuerySink implements Sink {
    client: BigQuery;
    schema: Schema;
    configuration: DPMConfiguration;
    tableExists: boolean;
    fieldPrefix = "field_";
    stateTableName = "_datapm_state";
    dbSchema: TableField[] = [];
    pendingInserts: { insertValue: { [key: string]: DPMRecordValue }; originalRecord: RecordStreamContext }[] = [];

    getType(): string {
        return TYPE;
    }

    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    isStronglyTyped(_configuration: DPMConfiguration): boolean {
        return true;
    }

    getSupportedStreamOptions(
        _configuration: DPMConfiguration,
        _sinkState: Maybe<SinkState>
    ): SinkSupportedStreamOptions {
        return {
            updateMethods:
                _configuration.insertMethod === "Bulk"
                    ? [UpdateMethod.BATCH_FULL_SET]
                    : [UpdateMethod.BATCH_FULL_SET, UpdateMethod.APPEND_ONLY_LOG],
            streamSetProcessingMethods: [StreamSetProcessingMethod.PER_STREAM, StreamSetProcessingMethod.PER_STREAM_SET]
        };
    }

    sanitizeName(name: string): string {
        return name.replace(/[.\-\s/\\]/g, "_");
    }

    async getDefaultParameterValues(
        catalogSlug: string | undefined,
        packageFile: PackageFile,
        configuration: DPMConfiguration
    ): Promise<DPMConfiguration> {
        return {
            projectId: configuration.projectId || null,
            dataset:
                configuration.dataset ||
                this.sanitizeName(
                    catalogSlug + "_" + packageFile.packageSlug + "-v" + new SemVer(packageFile.version).major
                ),
            tableName: packageFile.schemas[0].title || null,
            insertMethod: configuration.insertMethod || "Bulk"
        };
    }

    filterDefaultConfigValues(
        _catalogSlug: string | undefined,
        _packageFile: PackageFile,
        _configuration: Record<string, string | number | boolean | null>
        // eslint-disable-next-line @typescript-eslint/no-empty-function
    ): void {}

    async getParameters(
        catalogSlug: string,
        packageFile: PackageFile,
        configuration: DPMConfiguration
    ): Promise<Parameter[]> {
        if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            throw new Error(
                `The Application Default Credentials are not available. They are available if running in Google Compute Engine. Otherwise, the environment variable GOOGLE_APPLICATION_CREDENTIALS must be defined pointing to a file defining the credentials. See https://developers.google.com/accounts/docs/application-default-credentials for more information.`
            );
        }

        const parameters: Parameter[] = [];
        const defaultParameterValues: DPMConfiguration = await this.getDefaultParameterValues(
            catalogSlug,
            packageFile,
            configuration
        );

        if (configuration.projectId == null) {
            let projectId = null;
            const credentials = fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS as string, "utf-8");
            projectId = JSON.parse(credentials).project_id;

            parameters.push({
                configuration,
                type: ParameterType.Select,
                name: "projectId",
                message: "Project ID?",
                options: [{ title: projectId, value: projectId }],
                defaultValue: projectId
            });
        }

        if (configuration.dataset == null) {
            parameters.push({
                configuration,
                type: ParameterType.Text,
                name: "dataset",
                message: "Dataset?",
                defaultValue: defaultParameterValues.dataset as string
            });
        }

        if (configuration.tableName == null) {
            parameters.push({
                configuration,
                type: ParameterType.Text,
                name: "tableName",
                message: "Table Name?",
                defaultValue: defaultParameterValues.tableName as string
            });
        }

        if (configuration.insertMethod == null) {
            parameters.push({
                configuration,
                type: ParameterType.Select,
                name: "insertMethod",
                message: "Insert Method?",
                options: [
                    { title: "Bulk", value: "Bulk" },
                    { title: "Stream", value: "Stream" }
                ],
                defaultValue: defaultParameterValues.insertMethod as string
            });
        }

        return parameters;
    }

    async checkDBExistence(client: BigQuery, configuration: DPMConfiguration): Promise<void> {
        if (configuration.dataset == null) throw new Error("'dataset' is a required configuration value for BigQuery");

        // Check if project ID is valid one
        if ((await client.getProjectId()) !== configuration.projectId) {
            throw new Error(`\nUnable to detect this Project Id in the current environment\n`);
        }

        // Create dataset if not existing
        const [isDatasetExisting] = await client.dataset(configuration.dataset as string).exists();
        if (!isDatasetExisting) {
            await client.createDataset(configuration.dataset as string);
        }
    }

    async getWriteable(schema: Schema, configuration: DPMConfiguration): Promise<WritableWithContext> {
        this.schema = schema;
        this.configuration = configuration;

        // Open a connection to big query
        this.client = new BigQuery();

        await this.checkDBExistence(this.client, configuration);

        // Create a table from the schema
        await this.createTableFromSchema(schema);

        const { projectId, dataset } = configuration;
        const tableName = this.sanitizeName(configuration.tableName as string);

        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;

        return {
            outputLocation: `https://console.cloud.google.com/bigquery?project=${projectId}&p=${projectId}&d=${dataset}&t=${tableName}&page=table`,
            writable: new Transform({
                objectMode: true,
                write: async function (records: RecordStreamContext[], encoding, callback) {
                    for (const record of records) {
                        await self.writeRecord(record, this);
                    }
                    callback();
                },
                final: async function (callback) {
                    await self.complete(this);
                    callback();
                }
            }),
            getCommitKeys: () => {
                return [];
            }
        };
    }

    async writeRecord(recordStreamContext: RecordStreamContext, transform: Transform): Promise<void> {
        const record = recordStreamContext.recordContext.record;

        if (this.schema.properties == null) throw new Error("Schema properties not definied, and are required");

        // Loop over the schema properties, and create data to insert
        const keys = Object.keys(this.schema.properties);

        const insertRecord: {
            [key: string]: DPMRecordValue;
        } = {};

        for (const key of keys) {
            const property = this.schema.properties[key];
            const value: DPMRecordValue = record[key];

            if (value == null || value === "") {
                // "" values are turned into nulls. Is that the right thing to do?
                continue;
            }

            // TODO What to do if it's a date?

            const formats = (property.format || "").split(",").filter((format) => format !== "null");

            let dbKey = `${this.fieldPrefix}_${this.sanitizeName(key)}`;

            let valueType = discoverValueType(value);
            if (formats.length === 1) {
                if (valueType.type !== "null") {
                    const type = formats[0]
                        .replace("date-time", "date")
                        .replace("integer", "number") as ExtendedJSONSchema7TypeName;
                    valueType = { type, format: formats[0] };
                }
            } else if (formats.length > 1) {
                let typeAppend = valueType.format;
                if (typeAppend === "integer" && !formats.includes("integer")) {
                    typeAppend = "number";
                } else if (typeAppend === "date" && !formats.includes("date")) {
                    typeAppend = "date-time";
                }
                dbKey += "-" + typeAppend;
            }
            insertRecord[dbKey] = convertValueByValueType(value, valueType);
        }

        this.pendingInserts.push({
            insertValue: insertRecord,
            originalRecord: recordStreamContext
        });

        if (this.pendingInserts.length >= 200) {
            await this.flushPendingInserts(transform);
        }
    }

    async complete(transform: Transform): Promise<void> {
        if (this.pendingInserts.length > 0) {
            await this.flushPendingInserts(transform);
        }

        if (this.tableExists) {
            const tableName = this.sanitizeName(this.configuration.tableName as string);
            const dataset = this.client.dataset(this.configuration.dataset as string);
            // Rename is not supported
            await dataset.table(tableName).delete();
            await dataset.table(tableName).create();
            await dataset.table(`${tableName}_new`).copy(dataset.table(tableName));
            await dataset.table(`${tableName}_new`).delete();
        }
    }

    async createTableFromSchema(schema: Schema): Promise<void> {
        if (schema.type !== "object") {
            throw new Error("not a schema object!");
        }
        if (schema.title == null) throw new Error("Schema title defined, and is required");
        if (schema.properties == null) throw new Error("Schema properties are required for create database model");

        let tableName = this.sanitizeName(this.configuration.tableName as string);
        const [tableExists] = await this.client
            .dataset(this.configuration.dataset as string)
            .table(tableName)
            .exists();
        this.tableExists = tableExists;
        tableName = tableExists ? `${tableName}_new` : tableName;

        // eslint-disable-next-line
        const dbSchema: TableField[] = [];
        const keys = Object.keys(schema.properties);

        for (const key of keys) {
            const property = schema.properties[key];

            if (property.type === undefined) {
                // Log a warning
                continue;
            }

            if (Array.isArray(property.type)) {
                const formats = (property.format || "").split(",").filter((type) => type !== "null");

                for (const format of formats) {
                    let typeAppend = "";

                    if (formats.length > 1) {
                        typeAppend = "-" + format;
                        // Log a warning
                    }
                    if (format === "null") continue;
                    if (format === "object") {
                        throw new Error("nesting not yet supported!");
                    }
                    if (format === "array") {
                        throw new Error("relationships not yet supported!");
                    }
                    if (format === "boolean") {
                        dbSchema.push({
                            name: `${key}${typeAppend}`,
                            type: "BOOLEAN"
                        });
                    } else if (format === "number") {
                        dbSchema.push({
                            name: `${key}${typeAppend}`,
                            type: "FLOAT"
                        });
                    } else if (format === "integer") {
                        dbSchema.push({
                            name: `${key}${typeAppend}`,
                            type: "INTEGER"
                        });
                    } else if (format === "date") {
                        dbSchema.push({
                            name: `${key}${typeAppend}`,
                            type: "DATE"
                        });
                    } else if (format === "date-time") {
                        dbSchema.push({
                            name: `${key}${typeAppend}`,
                            type: "DATETIME"
                        });
                    } else if (format === "string") {
                        dbSchema.push({
                            name: `${key}${typeAppend}`,
                            type: "STRING"
                        });
                    }
                }
            } else {
                throw new Error("Properties with schema type single values (non-arrays) are not yet supported");
            }
        }

        dbSchema.forEach((field) => {
            field.name = `${this.fieldPrefix}_${this.sanitizeName(field.name as string)}`;
        });
        this.dbSchema = dbSchema;

        // In case temporary table wasn't delete last time, delete it first
        if (tableExists) {
            try {
                await this.client
                    .dataset(this.configuration.dataset as string)
                    .table(tableName)
                    .delete();
            } catch (err) {}
        }

        await this.client.dataset(this.configuration.dataset as string).createTable(tableName, { schema: dbSchema });
    }

    async flushPendingInserts(transform: Transform): Promise<void> {
        let tableName = this.sanitizeName(this.configuration.tableName as string);
        tableName = this.tableExists ? `${tableName}_new` : tableName;

        if (this.configuration.insertMethod === "Bulk") {
            const fileName = `${tableName}.csv`;
            fs.writeFileSync(fileName, this.getCSV(this.pendingInserts.map((i) => i.insertValue)));
            await this.client
                .dataset(this.configuration.dataset as string)
                .table(tableName)
                .load(fileName);

            fs.unlinkSync(fileName);
        } else {
            // Streaming insert is not allowed in the free tier
            this.pendingInserts.forEach((insert) => {
                Object.keys(insert.insertValue).forEach((key) => {
                    const record = insert.insertValue;
                    if (record[key] instanceof Date) {
                        record[key] = (record[key] as Date).toISOString().slice(0, -1);
                    }
                });
            });
            await this.client
                .dataset(this.configuration.dataset as string)
                .table(tableName)
                .insert(this.pendingInserts.map((i) => i.insertValue));
        }

        if (this.pendingInserts.length > 0)
            transform.push(this.pendingInserts[this.pendingInserts.length - 1].originalRecord);
        this.pendingInserts = [];
    }

    getCSV(data: { [key: string]: DPMRecordValue }[]): string {
        let csvContent = "";
        data.forEach((row) => {
            csvContent += this.dbSchema
                .map((column) => {
                    const columnName = column.name as string;
                    let columnValue = "";
                    if (row[columnName] instanceof Date) {
                        if (column.type === "DATE") {
                            columnValue = moment.utc(row[columnName] as string).format("YYYY-MM-DD");
                        } else {
                            columnValue = moment.utc(row[columnName] as string).format("YYYY-MM-DD HH:mm:ss");
                        }
                    } else {
                        columnValue = `${row[columnName] || ""}`;
                    }
                    columnValue = columnValue.replace(/"/g, '""');
                    columnValue = columnValue.replace(/[\r\n]/g, "");

                    return `"${columnValue}"`;
                })
                .join(",");
            csvContent += "\n";
        });
        return csvContent;
    }

    async commitAfterWrites(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        commitKeys: CommitKey[], // TODO possibly use this to commit tables, but BigQuery may not support this. Might need to do some row flags somehow
        sinkStateKey: SinkStateKey,
        sinkState: SinkState
    ): Promise<void> {
        if (configuration.insertMethod === "Bulk") return;

        const client = new BigQuery();
        await this.checkDBExistence(client, configuration);

        const dataset = client.dataset(configuration.dataset as string);

        const [tableExists] = await dataset.table(this.stateTableName).exists();
        const dbSchema = [
            { name: "catalogSlug", type: "STRING" },
            { name: "packageSlug", type: "STRING" },
            { name: "packageMajorVersion", type: "INTEGER" },
            { name: "streamSets", type: "STRING" },
            { name: "packageVersion", type: "STRING" },
            { name: "timestamp", type: "DATETIME" }
        ];

        if (!tableExists) {
            await dataset.createTable(this.stateTableName, { schema: dbSchema });
        }

        const deleteQuery = `DELETE FROM \`${configuration.projectId}.${configuration.dataset as string}.${
            this.stateTableName
        }\`
			WHERE timestamp < DATETIME_SUB(CURRENT_DATETIME(), INTERVAL 90 MINUTE)
		`;

        const newState = [
            {
                catalogSlug: sinkStateKey.catalogSlug,
                packageSlug: sinkStateKey.packageSlug,
                packageMajorVersion: sinkStateKey.packageMajorVersion,
                packageVersion: sinkState.packageVersion,
                streamSets: JSON.stringify(sinkState.streamSets),
                timestamp: new Date().toISOString().slice(0, -1)
            }
        ];

        await dataset.table(this.stateTableName).insert(newState);

        await client.createQueryJob({ query: deleteQuery });
    }

    async getSinkState(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        _configuration: DPMConfiguration,
        _sinkStateKey: SinkStateKey
    ): Promise<Maybe<SinkState>> {
        if (_configuration.insertMethod === "Bulk") return null;

        const client = new BigQuery();
        await this.checkDBExistence(client, _configuration);
        const dataset = client.dataset(_configuration.dataset as string);
        const [tableExists] = await dataset.table(this.stateTableName).exists();

        if (!tableExists) return null;
        const query = `SELECT *
			FROM \`${_configuration.projectId}.${_configuration.dataset as string}.${this.stateTableName}\`
			WHERE catalogSlug = "${_sinkStateKey.catalogSlug}" AND packageSlug = "${_sinkStateKey.packageSlug}"
						AND packageMajorVersion = ${_sinkStateKey.packageMajorVersion}
			ORDER BY timestamp DESC LIMIT 1
			`;

        const [job] = await client.createQueryJob({ query: query });
        const [rows] = await job.getQueryResults();

        const row = rows.length > 0 ? rows[0] : null;

        if (row == null) return null;

        let streamSets = {};

        if (row.streamSets != null) {
            try {
                streamSets = JSON.parse(row.streamSets);
            } catch (error) {
                // TODO have a context warn log message
            }
        }

        const sinkState: SinkState = {
            packageVersion: row.packageVersion,
            streamSets,
            timestamp: row.timestamp
        };

        return sinkState;
    }
}
