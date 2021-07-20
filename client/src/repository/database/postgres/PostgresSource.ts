import chalk from "chalk";
import { DPMConfiguration } from "datapm-lib";
import Knex from "knex";
import { Parameter, ParameterType } from "../../../util/parameters/Parameter";
import {
    StreamSetPreview,
    SourceErrors,
    SourceInspectionContext as URIInspectionContext,
    InspectionResults,
    Source,
    UpdateMethod,
    RecordContext
} from "../../Source";
import { Transform } from "stream";
import { table } from "console";
import { TYPE } from "./PostgresRepositoryDescription";

export class PostgresSource implements Source {
    sourceType(): string {
        return TYPE;
    }

    removeSecretConfigValues(
        _configuration: DPMConfiguration
        // eslint-disable-next-line @typescript-eslint/no-empty-function
    ): void {}

    getDefaultParameterValues(configuration: DPMConfiguration): DPMConfiguration {
        return {
            database: configuration.database || "postgres",
            schema: configuration.schema || "public"
        };
    }

    async getInspectParameters(configuration: DPMConfiguration): Promise<Parameter[]> {
        const parameters: Parameter[] = [];

        if (configuration.database == null) {
            parameters.push({
                configuration,
                type: ParameterType.Text,
                name: "database",
                message: "Database?",
                defaultValue: this.getDefaultParameterValues(configuration).database as string
            });
        }

        if (configuration.schema == null) {
            parameters.push({
                configuration,
                type: ParameterType.Text,
                name: "schema",
                message: "Schema?",
                defaultValue: this.getDefaultParameterValues(configuration).schema as string
            });
        }

        if (parameters.length === 0 && !configuration.tables) {
            try {
                const client = await this.checkConnection(configuration);
                const tableNames = await this.fetchSchemaTableNames(client, configuration.schema as string);
                if (tableNames.length === 0) {
                    console.log(chalk("No table exists in the schema"));
                    process.exit(1);
                }
                const tableOptions = tableNames
                    .filter((tableName) => tableName !== "_datapm_state")
                    .map((tableName) => ({
                        title: tableName,
                        value: tableName,
                        selected: true
                    }));
                parameters.push({
                    configuration,
                    type: ParameterType.MultiSelect,
                    name: "tables",
                    message: "Tables?",
                    options: tableOptions,
                    min: 1
                });
            } catch (error) {
                console.log(chalk(error.message));
                process.exit(1);
            }
        }

        return parameters;
    }

    async inspectURIs(configuration: DPMConfiguration, context: URIInspectionContext): Promise<InspectionResults> {
        let remainingParameter = await this.getInspectParameters(configuration);

        while (remainingParameter.length > 0) {
            await context.parameterPrompt(remainingParameter);
            remainingParameter = await this.getInspectParameters(configuration);
        }

        const tableStreams: StreamSetPreview[] = [];

        for (const table of (configuration.tables as string).split(",")) {
            const tableStream = await this.getTableStream(table, configuration, context);

            tableStreams.push(tableStream);
        }

        return {
            defaultDisplayName:
                (configuration.tables as string[]).length > 0
                    ? (configuration.database as string)
                    : (configuration.tables as string[])[0],
            source: this,
            configuration,
            streamSetPreviews: tableStreams
        };
    }

    async getTableStream(
        tableName: string,
        configuration: DPMConfiguration,
        _context: URIInspectionContext
    ): Promise<StreamSetPreview> {
        if (configuration == null) throw new Error("");

        const client = this.createClient(configuration as DPMConfiguration);

        // Get Last Modified Date
        let updateHash = new Date().toISOString();
        try {
            const result = await client
                .table(`${configuration.schema}.${table}`)
                .select(client.raw("MAX(pg_xact_commit_timestamp(xmin))"));
            const lastUpdatedAt = result[0].max;
            if (lastUpdatedAt !== null) {
                updateHash = new Date(lastUpdatedAt).toISOString();
            }
        } catch (error) {
            // Failed Cause "track_commit_timestamp" is Off
        }

        return {
            slug: tableName,
            configuration: {}, // TODO Probably not needed?
            supportedUpdateMethods: [UpdateMethod.BATCH_FULL_SET],
            updateHash,
            streamSummaries: [
                {
                    name: tableName,
                    // TODO provide expectedRecordCount
                    openStream: async () => {
                        const stream = client.table(`${configuration?.schema}.${tableName}`).stream({
                            readableObjectMode: true
                        });
                        return {
                            name: tableName as string,
                            stream,
                            transforms: [
                                new Transform({
                                    objectMode: true,
                                    transform: function (record, encoding, callback) {
                                        const recordContext: RecordContext = {
                                            record,
                                            schemaSlug: tableName as string
                                        };

                                        callback(null, recordContext);
                                    }
                                })
                            ]
                        };
                    }
                }
            ]
        };
    }

    private createClient(configuration: DPMConfiguration): Knex {
        // Open a connection to the database
        return Knex({
            client: "pg",
            connection: {
                host: configuration.host,
                port: configuration.port,
                user: configuration.username,
                password: configuration.password,
                database: configuration.database,
                connectTimeout: 3000
            } as Knex.PgConnectionConfig
        });
    }

    private async checkConnection(configuration: DPMConfiguration): Promise<Knex> {
        // Open a connection to the database
        const client = this.createClient(configuration);

        // Check DB Existence
        try {
            await client.raw("SELECT 1 + 1 as result");
        } catch (error) {
            if (error.message.includes("ENOTFOUND")) {
                throw new Error(SourceErrors.CONNECTION_FAILED);
            }
            if (error.message.includes("EAI_AGAIN")) {
                throw new Error(SourceErrors.CONNECTION_FAILED);
            }
            if (error.message.includes("password authentication")) {
                throw new Error(SourceErrors.AUTHENTICATION_FAILED);
            }
            if (error.message.includes("does not exist")) {
                throw new Error(SourceErrors.DATABASE_NOT_FOUND);
            } else {
                throw error;
            }
        }

        return client;
    }

    private async fetchSchemaTableNames(client: Knex, schema: string): Promise<string[]> {
        return (await client.select("tablename").from("pg_catalog.pg_tables").where({ schemaname: schema })).map(
            (table) => table.tablename
        );
    }
}
