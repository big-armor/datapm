import {
    SinkState,
    SinkStateKey,
    DPMConfiguration,
    DPMRecordValue,
    PackageFile,
    Schema,
    UpdateMethod,
    RecordStreamContext,
    Parameter
} from "datapm-lib";
import knex, { Knex } from "knex";
import { Transform } from "stream";
import { Maybe } from "../../util/Maybe";
import { StreamSetProcessingMethod } from "../../util/StreamToSinkUtil";
import { CommitKey, Sink, SinkSupportedStreamOptions, WritableWithContext } from "../Sink";
import { JobContext } from "../../task/JobContext";
import { convertValueByValueType, discoverValueType } from "../../util/SchemaUtil";

export abstract class KnexSink implements Sink {
    client: Knex;
    schema: Schema;
    configuration: DPMConfiguration;
    pendingInserts: { insertRecord: { [key: string]: DPMRecordValue }; originalRecord: RecordStreamContext }[] = [];
    stateTableName = "_datapm_state";

    /** See Sink.getType description */
    abstract getType(): string;

    /** See Sink.getDisplayName description */
    abstract getDisplayName(): string;

    /** Called when the stream of records to write is complete,
     * and after flushPendingInserts. Use this to finalize table names, etc */
    abstract complete(): Promise<void>;

    abstract filterDefaultConfigValues(
        _catalogSlug: string | undefined,
        _packageFile: PackageFile,
        _configuration: Record<string, string | number | boolean | null>
    ): // eslint-disable-next-line @typescript-eslint/no-empty-function
    void;

    abstract getParameters(
        catalogSlug: string | undefined,
        schema: PackageFile,
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        jobContext: JobContext
    ): Promise<Parameter[]>;

    abstract getSchemaBuilder(tx: Knex.Transaction | Knex, configuration: DPMConfiguration): Knex.SchemaBuilder;

    abstract getTableRef(tx: Knex.Transaction | Knex): Knex.Ref<string, { [x: string]: string }>;

    abstract getStateTableRef(
        tx: Knex.Transaction | Knex,
        configuration: DPMConfiguration
    ): Knex.Ref<string, { [x: string]: string }>;

    abstract getOutputLocationString(
        schema: Schema,
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration
    ): string;

    abstract createClient(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration
    ): Promise<Knex>;

    abstract checkDBExistence(client: Knex.Transaction | Knex, configuration: DPMConfiguration): Promise<void>;

    isStronglyTyped(_configuration: DPMConfiguration): boolean {
        return true;
    }

    getSupportedStreamOptions(
        _configuration: DPMConfiguration,
        _sinkState: Maybe<SinkState>
    ): SinkSupportedStreamOptions {
        return {
            updateMethods: [UpdateMethod.BATCH_FULL_SET, UpdateMethod.APPEND_ONLY_LOG, UpdateMethod.CONTINUOUS],
            streamSetProcessingMethods: [StreamSetProcessingMethod.PER_STREAM_SET, StreamSetProcessingMethod.PER_STREAM]
        };
    }

    async getWriteable(
        schema: Schema,
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        _updateMethod: UpdateMethod,
        replaceExistingData: boolean,
        _jobContext: JobContext
    ): Promise<WritableWithContext> {
        this.schema = schema;
        this.configuration = configuration;

        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;

        return {
            outputLocation: this.getOutputLocationString(
                schema,
                connectionConfiguration,
                credentialsConfiguration,
                configuration
            ),
            writable: new Transform({
                objectMode: true,
                transform: async function (chunk: RecordStreamContext[], encoding, callback) {
                    try {
                        await self.writeRecord(chunk, this);
                    } catch (error) {
                        callback(error);
                    }

                    callback();
                },

                final: async function (callback) {
                    try {
                        await self.flushPendingInserts(this);
                        await self.complete();
                        callback();
                    } catch (error) {
                        callback(error);
                    }
                }
            }),
            getCommitKeys: () => {
                return [];
            }
        };
    }

    async writeRecord(chunks: RecordStreamContext[], transform: Transform): Promise<void> {
        if (this.schema.properties == null) throw new Error("Schema properties not definied, and are required");

        // Loop over the schema properties, and create data to insert
        const keys = Object.keys(this.schema.properties);

        for (const chunk of chunks) {
            const insertRecord: {
                [key: string]: DPMRecordValue;
            } = {};
            for (const key of keys) {
                const property = this.schema.properties[key];

                if (property.title == null) throw new Error(`Property ${key} has no title`);

                let propertyTtile = this.getSafeColumnName(property.title);

                const value: DPMRecordValue = chunk.recordContext.record[propertyTtile];

                if (value == null || value === "") {
                    // "" values are turned into nulls. Is that the right thing to do?
                    continue;
                }

                const types = Object.keys(property.types).filter((type) => type !== "null");

                let valueType = discoverValueType(value);

                if (valueType === "null") {
                    continue;
                }

                if (types.length === 1) {
                    // nothing to do?
                } else if (types.length > 1) {
                    if (valueType === "integer" && types.includes("number")) {
                        valueType = "number";
                    }

                    propertyTtile += "-" + valueType;
                }
                insertRecord[propertyTtile] = convertValueByValueType(value, valueType);
            }

            this.pendingInserts.push({ insertRecord: insertRecord, originalRecord: chunk });

            if (this.pendingInserts.length >= 100) {
                await this.flushPendingInserts(transform);

                this.pendingInserts = [];
            }
        }

        if (this.pendingInserts.length >= 100) {
            await this.flushPendingInserts(transform);

            this.pendingInserts = [];
        }
    }

    getSafeColumnName(schemaPropertyName: string): string {
        return schemaPropertyName.replace(".", "_");
    }

    getSafeTableName(name: string): string {
        return name.replace(/\./g, "-");
    }

    buildTableFromSchema(tableBuilder: Knex.CreateTableBuilder, schema: Schema): void {
        if (schema.properties == null) throw new Error("Schema properties are required for " + tableBuilder);

        const propertyKeys = Object.keys(schema.properties);

        for (const propertyKey of propertyKeys) {
            const property = schema.properties[propertyKey];

            if (property.title == null) throw new Error("Property title is required for " + propertyKey);

            const title = this.getSafeTableName(property.title);

            const types = Object.keys(property.types).filter((type) => type !== "null");

            for (const type of types) {
                let typeAppend = "";

                if (types.length > 1) {
                    typeAppend = "-" + type;
                }
                if (type === "null") continue;
                if (type === "object") {
                    tableBuilder.jsonb(title + typeAppend);
                }
                if (type === "array") {
                    tableBuilder.jsonb(title + typeAppend);
                }
                if (type === "boolean") {
                    tableBuilder.boolean(title + typeAppend);
                } else if (type === "number") {
                    tableBuilder.double(title + typeAppend);
                } else if (type === "integer") {
                    tableBuilder.bigInteger(title + typeAppend);
                } else if (type === "date") {
                    tableBuilder.date(title + typeAppend);
                } else if (type === "date-time") {
                    tableBuilder.dateTime(title + typeAppend, { useTz: false });
                } else if (type === "string") {
                    tableBuilder.text(title + typeAppend);
                    // TODO use string length determine if it should be an indexable varchar
                }
            }
        }
    }

    async flushPendingInserts(transform: Transform): Promise<void> {
        const tableName = this.getTableRef(this.client);

        if (this.pendingInserts.length === 0) return;

        const response = await this.client.table(tableName).insert(this.pendingInserts.map((p) => p.insertRecord));

        if (this.pendingInserts.length > 0)
            transform.push(this.pendingInserts[this.pendingInserts.length - 1].originalRecord);

        this.pendingInserts = [];
    }

    mapSinkStateKeyToColumnName(stateKey: string): string {
        return stateKey;
    }

    async createStateTable(transaction: Knex, configuration: DPMConfiguration): Promise<void> {
        return new Promise((resolve, reject) => {
            const schemaBuilder = this.getSchemaBuilder(transaction, configuration);
            schemaBuilder
                .createTable(this.stateTableName, (tableBuilder) => {
                    tableBuilder.string(this.mapSinkStateKeyToColumnName("catalogSlug"));
                    tableBuilder.string(this.mapSinkStateKeyToColumnName("packageSlug"));
                    tableBuilder.integer(this.mapSinkStateKeyToColumnName("packageMajorVersion"));
                    tableBuilder.text(this.mapSinkStateKeyToColumnName("streamSets"));
                    tableBuilder.string(this.mapSinkStateKeyToColumnName("packageVersion"));
                    tableBuilder.dateTime(this.mapSinkStateKeyToColumnName("timestamp"), { useTz: false });
                    resolve();
                })
                .catch(reject);
        });
    }

    async checkStateTableExists(tx: Knex.Transaction | Knex, configuration: DPMConfiguration): Promise<boolean> {
        const schemaBuilder = this.getSchemaBuilder(tx, configuration);
        const tableExists = await schemaBuilder.hasTable(this.stateTableName);
        return tableExists;
    }

    async commitAfterWrites(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        commitKeys: CommitKey[], // TODO use this to rename temporary tables during batch uploads
        sinkStateKey: SinkStateKey,
        sinkState: SinkState
    ): Promise<void> {
        const client = await this.createClient(connectionConfiguration, credentialsConfiguration, configuration);
        await this.checkDBExistence(client, configuration);

        await client.transaction(async (tx) => {
            const tableExists = await this.checkStateTableExists(tx, configuration);

            if (!tableExists) {
                try {
                    await this.createStateTable(tx, configuration);
                } catch (error) {
                    throw new Error("state table not created yet!");
                }
            }

            const tableRef = this.getStateTableRef(tx, configuration);
            const oldStates = await tx
                .table(tableRef)
                .select(...["streamSets", "packageVersion", "timestamp"].map(this.mapSinkStateKeyToColumnName))
                .where({
                    [this.mapSinkStateKeyToColumnName("catalogSlug")]: sinkStateKey.catalogSlug,
                    [this.mapSinkStateKeyToColumnName("packageSlug")]: sinkStateKey.packageSlug,
                    [this.mapSinkStateKeyToColumnName("packageMajorVersion")]: sinkStateKey.packageMajorVersion
                });

            if (!oldStates || oldStates.length === 0) {
                const records = [
                    {
                        [this.mapSinkStateKeyToColumnName("catalogSlug")]: sinkStateKey.catalogSlug,
                        [this.mapSinkStateKeyToColumnName("packageSlug")]: sinkStateKey.packageSlug,
                        [this.mapSinkStateKeyToColumnName("packageMajorVersion")]: sinkStateKey.packageMajorVersion,
                        [this.mapSinkStateKeyToColumnName("streamSets")]: JSON.stringify(sinkState.streamSets),
                        [this.mapSinkStateKeyToColumnName("packageVersion")]: sinkState.packageVersion,
                        [this.mapSinkStateKeyToColumnName("timestamp")]: sinkState.timestamp
                    }
                ];
                await tx.table(tableRef).insert(records);
            } else {
                await tx
                    .table(tableRef)
                    .where({
                        [this.mapSinkStateKeyToColumnName("catalogSlug")]: sinkStateKey.catalogSlug,
                        [this.mapSinkStateKeyToColumnName("packageSlug")]: sinkStateKey.packageSlug,
                        [this.mapSinkStateKeyToColumnName("packageMajorVersion")]: sinkStateKey.packageMajorVersion
                    })
                    .update({
                        [this.mapSinkStateKeyToColumnName("packageVersion")]: sinkState.packageVersion,
                        [this.mapSinkStateKeyToColumnName("timestamp")]: sinkState.timestamp,
                        [this.mapSinkStateKeyToColumnName("streamSets")]: JSON.stringify(sinkState.streamSets)
                    });
            }

            client.destroy();
        });
    }

    async getSinkState(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        _sinkStateKey: SinkStateKey
    ): Promise<Maybe<SinkState>> {
        const client = await this.createClient(connectionConfiguration, credentialsConfiguration, configuration);
        await this.checkDBExistence(client, configuration);

        return new Promise((resolve) => {
            client
                .transaction(async (tx) => {
                    const tableExists = await this.checkStateTableExists(tx, configuration);
                    if (!tableExists) {
                        resolve(null);
                    } else {
                        const tableRef = tx.ref(this.stateTableName).withSchema(configuration.schema as string);
                        const state = await tx
                            .table(tableRef)
                            .select(
                                ...["streamSets", "packageVersion", "timestamp"].map(this.mapSinkStateKeyToColumnName)
                            )
                            .where({
                                [this.mapSinkStateKeyToColumnName("catalogSlug")]: _sinkStateKey.catalogSlug,
                                [this.mapSinkStateKeyToColumnName("packageSlug")]: _sinkStateKey.packageSlug,
                                [this.mapSinkStateKeyToColumnName(
                                    "packageMajorVersion"
                                )]: _sinkStateKey.packageMajorVersion
                            });

                        if (state == null || state.length === 0) {
                            resolve(null);
                            return;
                        }

                        const dbState = state[0];

                        resolve({
                            packageVersion: dbState[this.mapSinkStateKeyToColumnName("packageVersion")],
                            streamSets: JSON.parse(dbState[this.mapSinkStateKeyToColumnName("streamSets")]),
                            timestamp: dbState[this.mapSinkStateKeyToColumnName("timestamp")]
                        });
                    }
                    client.destroy();
                })
                .then();
        });
    }
}
