import { DPMConfiguration, UpdateMethod, RecordContext, Parameter, ParameterType } from "datapm-lib";
import knex, { Knex } from "knex";
import { StreamSetPreview, SourceErrors, InspectionResults, Source } from "../../Source";
import { Transform } from "stream";
import { table } from "console";
import { TYPE } from "./PostgresConnectorDescription";
import { JobContext } from "../../../task/JobContext";
import pg from "pg";

export class PostgresSource implements Source {
    sourceType(): string {
        return TYPE;
    }

    getDefaultParameterValues(configuration: DPMConfiguration): DPMConfiguration {
        return {
            database: configuration.database || "postgres",
            schema: configuration.schema || "public"
        };
    }

    async getInspectParameters(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration
    ): Promise<Parameter[]> {
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
            const client = await this.checkConnection(connectionConfiguration, credentialsConfiguration, configuration);
            const tableNames = await this.fetchSchemaTableNames(client, configuration.schema as string);
            if (tableNames.length === 0) {
                throw new Error("No table exists in the schema");
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
                numberMinimumValue: 1
            });
        }

        return parameters;
    }

    async inspectData(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        context: JobContext
    ): Promise<InspectionResults> {
        /* pg.types.setTypeParser(pg.types.builtins.INT8, (value: string) => {
            return parseInt(value);
        }); */

        let remainingParameter = await this.getInspectParameters(
            connectionConfiguration,
            credentialsConfiguration,
            configuration
        );

        while (remainingParameter.length > 0) {
            await context.parameterPrompt(remainingParameter);
            remainingParameter = await this.getInspectParameters(
                connectionConfiguration,
                credentialsConfiguration,
                configuration
            );
        }

        const tableStreams: StreamSetPreview[] = [];

        for (const table of configuration.tables as string[]) {
            const tableStream = await this.getTableStream(
                table,
                connectionConfiguration,
                credentialsConfiguration,
                configuration,
                context
            );

            tableStreams.push(tableStream);
        }

        return {
            defaultDisplayName:
                (configuration.tables as string[]).length > 1
                    ? (configuration.database as string)
                    : (configuration.tables as string[])[0],
            source: this,
            configuration,
            streamSetPreviews: tableStreams
        };
    }

    async getTableStream(
        tableName: string,
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        _context: JobContext
    ): Promise<StreamSetPreview> {
        if (configuration == null) throw new Error("");

        const client = this.createClient(
            connectionConfiguration,
            credentialsConfiguration,
            configuration as DPMConfiguration
        );

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
            updateHash,
            streamSummaries: [
                {
                    name: tableName,
                    updateMethod: UpdateMethod.BATCH_FULL_SET,
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
                                            schemaSlug: tableName as string,
                                            receivedDate: new Date()
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

    private createClient(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration
    ): Knex {
        // Open a connection to the database
        return knex({
            client: "pg",
            connection: {
                host: connectionConfiguration.host,
                port: connectionConfiguration.port,
                user: credentialsConfiguration.username,
                password: credentialsConfiguration.password,
                database: configuration.database,
                connectTimeout: 3000
            } as Knex.PgConnectionConfig
        });
    }

    private async checkConnection(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration
    ): Promise<Knex> {
        // Open a connection to the database
        const client = this.createClient(connectionConfiguration, credentialsConfiguration, configuration);

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
