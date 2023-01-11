import { DPMConfiguration, PackageFile, Schema, Parameter, ParameterType, UpdateMethod } from "datapm-lib";
import knex, { Knex } from "knex";
import { SemVer } from "semver";
import { KnexSink } from "../KnexSink";
import { DISPLAY_NAME, TYPE } from "./MySqlConnectorDescription";
import { Sink, SinkErrors, WritableWithContext } from "../../Sink";
import { JobContext } from "../../../task/JobContext";

export class MySqlSink extends KnexSink implements Sink {
    tablePrefix: string;
    tableName: string;
    tableExists: boolean;

    async createClient(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration
    ): Promise<Knex> {
        return knex({
            client: "mysql",
            connection: {
                host: connectionConfiguration.host,
                port: connectionConfiguration.port,
                user: credentialsConfiguration.username,
                password: credentialsConfiguration.password,
                database: configuration.database,
                charset: "utf8mb4"
            } as Knex.MySqlConnectionConfig
        });
    }

    getType(): string {
        return TYPE;
    }

    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    getOutputLocationString(
        schema: Schema,
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration
    ): string {
        return `mysql://${credentialsConfiguration.username}@${connectionConfiguration.host}:${connectionConfiguration.port}/${configuration.database}`;
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

        this.tablePrefix =
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

    getTableRef(tx: Knex.Transaction | Knex): Knex.Ref<string, { [x: string]: string }> {
        const tableName = this.tableExists ? `${this.tableName}_new` : this.tableName;
        return tx.ref(tableName);
    }

    getStateTableRef(tx: Knex.Transaction | Knex): Knex.Ref<string, { [x: string]: string }> {
        return tx.ref(this.stateTableName);
    }

    getSchemaBuilder(tx: Knex.Transaction | Knex): Knex.SchemaBuilder {
        return tx.schema;
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
        if (connectionConfiguration.host == null) throw new Error("'host' is a required configuration value for mysql");
        if (connectionConfiguration.port == null) throw new Error("'port' is a required configuration value for mysql");
        if (credentialsConfiguration.username == null)
            throw new Error("'username' is a required configuration value for mysql");
        if (credentialsConfiguration.password == null)
            throw new Error("'password' is a required configuration value for mysql");
        if (configuration.database == null) throw new Error("'database' is a required configuration value for mysql");
        if (schema.title == null) throw new Error("Schema name in configuration not definied, and are required");

        // Open a connection to the database
        this.client = await this.createClient(connectionConfiguration, credentialsConfiguration, configuration);

        // Check DB Existence
        this.checkDBExistence(this.client, configuration);

        const writable = super.getWriteable(
            schema,
            connectionConfiguration,
            credentialsConfiguration,
            configuration,
            updateMethod,
            replaceExistingData,
            jobContext
        );

        await this.client.transaction(async (tx) => {
            if (replaceExistingData) {
                await tx.schema.dropTableIfExists(this.getSafeTableName(this.tablePrefix + schema.title));
            }

            await this.createTableFromSchema(tx, schema);
        });

        return writable;
    }

    async checkDBExistence(client: Knex, configuration: DPMConfiguration): Promise<void> {
        try {
            await client.raw("SELECT 1 + 1 as result");
        } catch (error) {
            if (error.message.includes("ECONNREFUSED")) {
                throw new Error(SinkErrors.CONNECTION_FAILED);
            }
            if (error.message.includes("ENOTFOUND")) {
                throw new Error(SinkErrors.CONNECTION_FAILED);
            }
            if (error.message.includes("EAI_AGAIN")) {
                throw new Error(SinkErrors.CONNECTION_FAILED);
            }
            if (error.message.includes("ER_ACCESS_DENIED_ERROR")) {
                throw new Error(SinkErrors.AUTHENTICATION_FAILED);
            }
            if (error.message.includes("ER_BAD_DB_ERROR")) {
                await this.createDatabase(client, configuration);
            } else {
                throw error;
            }
        }
    }

    async complete(): Promise<void> {
        if (this.tableExists) {
            await this.client.schema.dropTable(this.tableName);
            await this.client.schema.renameTable(`${this.tableName}_new`, this.tableName);
        }

        return new Promise((resolve) => {
            // Close the database connection
            this.client.destroy(resolve);
        });
    }

    async createDatabase(client: Knex, configuration: DPMConfiguration): Promise<void> {
        await client.raw(`CREATE DATABASE ${configuration.database}`);
        client.destroy();
    }

    async createTableFromSchema(transaction: Knex, schema: Schema): Promise<void> {
        this.tableName = this.getSafeTableName(this.tablePrefix + schema.title);
        this.tableExists = await transaction.schema.hasTable(this.tableName);
        const tableName = this.tableExists ? `${this.tableName}_new` : this.tableName;

        return new Promise((resolve, reject) => {
            transaction.schema
                .createTable(tableName, (tableBuilder) => {
                    this.buildTableFromSchema(tableBuilder, schema);
                    resolve();
                })
                .catch(reject);
        });
    }
}
