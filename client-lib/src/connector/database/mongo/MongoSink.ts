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
import mongoose, { Document, Model, Mongoose, SchemaDefinition } from "mongoose";
import { SemVer } from "semver";
import { Transform } from "stream";
import { Maybe } from "../../../util/Maybe";
import { StreamSetProcessingMethod } from "../../../util/StreamToSinkUtil";
import { DISPLAY_NAME, TYPE } from "./MongoConnectorDescription";
import { CommitKey, Sink, SinkErrors, SinkSupportedStreamOptions, WritableWithContext } from "../../Sink";
import { JobContext } from "../../../task/JobContext";
import { convertValueByValueType, discoverValueType } from "../../../util/SchemaUtil";

export class MongoSinkModule implements Sink {
    client: Mongoose;
    model: Model<Document>;
    collectionPrefix: string;
    collectionName: string;
    collectionExists: boolean;
    stateCollectionName = "_datapm_state";
    schema: Schema;
    pendingInserts: {
        originalRecord: RecordStreamContext;
        insert: { [key: string]: DPMRecordValue };
    }[] = [];

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
            updateMethods: [UpdateMethod.BATCH_FULL_SET, UpdateMethod.APPEND_ONLY_LOG, UpdateMethod.CONTINUOUS],
            streamSetProcessingMethods: [StreamSetProcessingMethod.PER_STREAM_SET, StreamSetProcessingMethod.PER_STREAM]
        };
    }

    getUriFromConfiguration(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration
    ): string {
        let uri = "mongodb://";
        if (credentialsConfiguration.username) {
            uri = `${uri}${credentialsConfiguration.username}`;

            if (credentialsConfiguration.password) {
                uri = `${uri}:${credentialsConfiguration.password}`;
            }

            uri = `${uri}@`;
        }
        uri = `${uri}${connectionConfiguration.host}:${connectionConfiguration.port}/${configuration.database}`;
        return uri;
    }

    getSafeTableName(name: string): string {
        return name.replace(/\.-/g, "_");
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
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        jobContext: JobContext
    ): Promise<Parameter[]> {
        const parameters: Parameter[] = [];

        this.collectionPrefix =
            catalogSlug + "_" + packageFile.packageSlug + "-v" + new SemVer(packageFile.version).major + "_";

        if (configuration.database == null) {
            parameters.push({
                configuration,
                type: ParameterType.Text,
                name: "database",
                message: "Database?",
                defaultValue: configuration.database || "datapm"
            });
        }

        return parameters;
    }

    async getConnection(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration
    ): Promise<Mongoose> {
        try {
            mongoose.set("useUnifiedTopology", true);
            const client = await mongoose.connect(
                this.getUriFromConfiguration(connectionConfiguration, credentialsConfiguration, configuration),
                {
                    connectTimeoutMS: 3000,
                    socketTimeoutMS: 3000,
                    waitQueueTimeoutMS: 3000,
                    keepAlive: false,
                    maxIdleTimeMS: 3000,
                    autoReconnect: false,
                    useNewUrlParser: true,
                    useUnifiedTopology: true,
                    useFindAndModify: false
                }
            );
            return client;
        } catch (error) {
            if (error.message.includes("ENOTFOUND")) {
                throw new Error(SinkErrors.CONNECTION_FAILED + " - " + error.message);
            }
            if (error.message.includes("EAI_AGAIN")) {
                throw new Error(SinkErrors.CONNECTION_FAILED + " - " + error.message);
            }
            if (error.message.includes("ECONNREFUSED")) {
                throw new Error(SinkErrors.CONNECTION_FAILED + " - " + error.message);
            }
            if (error.message.includes("Authentication failed.")) {
                throw new Error(SinkErrors.AUTHENTICATION_FAILED);
            }
            throw error;
        }
    }

    async getWriteable(
        schema: Schema,
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration
    ): Promise<WritableWithContext> {
        if (connectionConfiguration.host == null)
            throw new Error("'host' is a required configuration value for MongoDB");
        if (connectionConfiguration.port == null)
            throw new Error("'port' is a required configuration value for MongoDB");
        if (credentialsConfiguration.username == null)
            throw new Error("'username' is a required configuration value for MongoDB");
        if (credentialsConfiguration.password == null)
            throw new Error("'password' is a required configuration value for MongoDB");
        if (configuration.database == null) throw new Error("'database' is a required configuration value for MongoDB");
        this.schema = schema;
        // Open a connection to the database
        this.client = await this.getConnection(connectionConfiguration, credentialsConfiguration, configuration);
        // Create a model from the schema
        await this.createModelFromSchema(schema);

        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;

        return {
            outputLocation: this.getUriFromConfiguration(
                connectionConfiguration,
                credentialsConfiguration,
                configuration
            ),
            writable: new Transform({
                objectMode: true,
                transform: async function (records: RecordStreamContext[], encoding, callback) {
                    for (const record of records) await self.writeRecord(record, this);

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

    async writeRecord(chunk: RecordStreamContext, transform: Transform): Promise<void> {
        const record = chunk.recordContext.record;

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

            const types = Object.keys(property.types).filter((type) => type !== "null");

            let dbKey = key;

            let valueType = discoverValueType(value);

            if (valueType === "integer" && types.includes("number")) {
                valueType = "number";
            }

            if (types.length > 1 && !types.includes(valueType)) {
                throw new Error("Value type " + valueType + " was not enumerated for property " + key);
                // TODO: automatically update the mongo schema to include the new type?
            }

            if (types.length > 1) {
                const typeAppend = valueType;
                dbKey += "_" + typeAppend;
            }
            insertRecord[dbKey] = convertValueByValueType(value, valueType);
        }

        this.pendingInserts.push({
            originalRecord: chunk,
            insert: insertRecord
        });

        if (this.pendingInserts.length >= 200) {
            await this.flushPendingInserts(transform);
        }
    }

    async complete(transform: Transform): Promise<void> {
        await this.flushPendingInserts(transform);

        if (this.collectionExists) {
            await this.client.connection.collection(this.collectionName, {}).drop();
            await this.client.connection.collection(`${this.collectionName}_new`, {}).rename(this.collectionName);
        }

        // Close the database connection
        return this.client.connection.close();
    }

    async createModelFromSchema(schema: Schema): Promise<void> {
        if (schema.title == null) throw new Error("Schema title defined, and is required");
        if (schema.properties == null) throw new Error("Schema properties are required for create database model");

        this.collectionName = this.getSafeTableName(this.collectionPrefix + schema.title);
        const collectionInfo = await this.client.connection.db.listCollections({ name: this.collectionName }).next();
        this.collectionExists = !!collectionInfo;

        // eslint-disable-next-line
        const dbSchema: SchemaDefinition = {};
        const keys = Object.keys(schema.properties);

        for (const key of keys) {
            const property = schema.properties[key];

            const types = Object.keys(property.types).filter((type) => type !== "null");

            for (const type of types) {
                let typeAppend = "";

                if (types.length > 1) {
                    typeAppend = "_" + type;
                    // Log a warning
                }
                if (type === "null") continue;
                if (type === "object") {
                    throw new Error("object type properties not yet supported for mongo sink");
                }
                if (type === "array") {
                    throw new Error("arrays not yet supported for mongo sink!");
                }
                if (type === "boolean") {
                    dbSchema[key + typeAppend] = { type: Boolean };
                } else if (type === "number") {
                    dbSchema[key + typeAppend] = { type: Number };
                } else if (type === "integer") {
                    dbSchema[key + typeAppend] = { type: Number };
                } else if (type === "date" || type === "date-time") {
                    dbSchema[key + typeAppend] = { type: Date };
                } else if (type === "string") {
                    dbSchema[key + typeAppend] = { type: String };
                }
            }
        }

        const collectionName = this.collectionExists ? `${this.collectionName}_new` : this.collectionName;
        this.model = this.client.model(
            collectionName,
            new this.client.Schema(dbSchema, { collection: collectionName })
        );
    }

    async flushPendingInserts(transform: Transform): Promise<void> {
        const inserts = this.pendingInserts.map((i) => i.insert);
        // eslint-disable-next-line no-useless-catch
        try {
            await this.model.insertMany(inserts);
        } catch (error) {
            throw error;
        }

        if (this.pendingInserts.length > 0)
            transform.push(this.pendingInserts[this.pendingInserts.length - 1].originalRecord);

        this.pendingInserts = [];
    }

    async commitAfterWrites(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        commitKeys: CommitKey[], // TODO use this to rename bulk upload tables to "commit" them
        sinkStateKey: SinkStateKey,
        sinkState: SinkState
    ): Promise<void> {
        const client = await this.getConnection(connectionConfiguration, credentialsConfiguration, configuration);
        const collectionInfo = client.connection.db.listCollections({ name: this.stateCollectionName });

        const schema: SchemaDefinition = {
            catalogSlug: String,
            packageSlug: String,
            packageMajorVersion: Number,
            streamSets: String,
            packageVersion: String,
            timestamp: Date
        };
        const StateModel = client.model(
            this.stateCollectionName,
            new client.Schema(schema, { collection: this.stateCollectionName })
        );

        const newState: { [key: string]: DPMRecordValue } = {
            catalogSlug: sinkStateKey.catalogSlug,
            packageSlug: sinkStateKey.packageSlug,
            packageMajorVersion: sinkStateKey.packageMajorVersion,
            streamSets: JSON.stringify(sinkState.streamSets),
            packageVersion: sinkState.packageVersion,
            timestamp: sinkState.timestamp
        };
        if (!collectionInfo) {
            await StateModel.create(newState);
        } else {
            await StateModel.findOneAndUpdate(
                {
                    catalogSlug: sinkStateKey.catalogSlug,
                    packageSlug: sinkStateKey.packageSlug,
                    packageMajorVersion: sinkStateKey.packageMajorVersion
                },
                newState,
                {
                    upsert: true
                }
            );
        }

        client.connection.close();
    }

    async getSinkState(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        _sinkStateKey: SinkStateKey
    ): Promise<Maybe<SinkState>> {
        const client = await this.getConnection(connectionConfiguration, credentialsConfiguration, configuration);
        const collectionInfo = await client.connection.db.listCollections({ name: this.stateCollectionName });

        if (!collectionInfo) {
            client.connection.close();
            return null;
        } else {
            const stateDoc = await client.connection.collection(this.stateCollectionName, {}).findOne({
                catalogSlug: _sinkStateKey.catalogSlug,
                packageSlug: _sinkStateKey.packageSlug,
                packageMajorVersion: _sinkStateKey.packageMajorVersion
            });
            client.connection.close();
            if (stateDoc) {
                return {
                    streamSets: stateDoc.streamSets != null ? JSON.parse(stateDoc.streamSets) : {},
                    packageVersion: stateDoc.packageVersion,
                    timestamp: stateDoc.timestamp
                };
            }
            return null;
        }
    }
}
