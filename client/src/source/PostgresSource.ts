import chalk from "chalk";
import { DPMConfiguration } from "datapm-lib";
import Knex from "knex";
import { parse } from "pg-connection-string";
import { Parameter, ParameterType } from "../util/ParameterUtils";
import {
    StreamSetPreview,
    SourceErrors,
    SourceInspectionContext as URIInspectionContext,
    InspectionResults,
    SourceInterface,
    UpdateMethod,
    RecordContext
} from "./SourceUtil";
import { Transform } from "stream";
import { table } from "console";

export class PostgresSource implements SourceInterface {
    sourceType(): string {
        return "postgres";
    }

    supportsURI(uri: string): boolean {
        return uri.startsWith("postgres://");
    }

    removeSecretConfigValues(
        _configuration: DPMConfiguration
        // eslint-disable-next-line @typescript-eslint/no-empty-function
    ): void {}

    parseUri(uri: string): DPMConfiguration {
        const parsedUri = parse(uri);
        const connectionOptions: DPMConfiguration = {
            host: parsedUri.host,
            port: parsedUri.port || null,
            username: parsedUri.user || null,
            password: parsedUri.password || null,
            database: parsedUri.database || null
        };
        Object.keys(connectionOptions).forEach((key) => {
            if (!connectionOptions[key]) delete connectionOptions[key];
        });
        return connectionOptions;
    }

    getDefaultParameterValues(configuration: DPMConfiguration): DPMConfiguration {
        return {
            host: configuration.host || "localhost",
            port: configuration.port || 5432,
            username: configuration.username || "",
            password: configuration.password || "",
            database: configuration.database || "postgres",
            schema: configuration.schema || "public"
        };
    }

    async getInspectParameters(configuration: DPMConfiguration): Promise<Parameter[]> {
        if (configuration.uris != null && (configuration.uris as string[]).length > 0) {
            const urlConfiguration = this.parseUri((configuration.uris as string[])[0]);

            for (const key of Object.keys(urlConfiguration)) {
                configuration[key] = urlConfiguration[key];
            }

            delete configuration.uris;
        }

        const parameters: Parameter[] = [];

        const defaultParameterValues: DPMConfiguration = this.getDefaultParameterValues(configuration);

        if (configuration.host == null) {
            parameters.push({
                configuration,
                type: ParameterType.Text,
                name: "host",
                message: "Hostname or IP?",
                defaultValue: defaultParameterValues.host as string
            });
        }

        if (configuration.port == null) {
            parameters.push({
                configuration,
                type: ParameterType.Number,
                name: "port",
                message: "Port?",
                defaultValue: defaultParameterValues.port as number
            });
        }

        if (configuration.username == null) {
            parameters.push({
                configuration,
                type: ParameterType.Text,
                name: "username",
                message: "Username?",
                defaultValue: defaultParameterValues.username as string
            });
        }

        if (configuration.password == null) {
            parameters.push({
                configuration,
                type: ParameterType.Password,
                name: "password",
                message: "Password?",
                defaultValue: defaultParameterValues.password as string
            });
        }

        if (configuration.database == null) {
            parameters.push({
                configuration,
                type: ParameterType.Text,
                name: "database",
                message: "Database?",
                defaultValue: defaultParameterValues.database as string
            });
        }

        if (configuration.schema == null) {
            parameters.push({
                configuration,
                type: ParameterType.Text,
                name: "schema",
                message: "Schema?",
                defaultValue: defaultParameterValues.schema as string
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
