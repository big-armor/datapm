import chalk from "chalk";
import { DPMConfiguration, RecordContext, UpdateMethod } from "datapm-lib";
import fs from "fs";
import { BigQuery, BigQueryDatetime, BigQueryTimestamp } from "@google-cloud/bigquery";
import { Transform } from "stream";
import { Parameter, ParameterType } from "../../../util/parameters/Parameter";
import { SourceInspectionContext, Source, StreamSetPreview, InspectionResults } from "../../Source";
import { TYPE } from "./BigQueryRepositoryDescription";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const sqlParser = require("js-sql-parser");

interface FullPath {
    projectId?: string;
    dataset?: string;
    tableName?: string;
}

export class BigQuerySource implements Source {
    sourceType(): string {
        return TYPE;
    }

    parseUri(uri: string): DPMConfiguration {
        const parsedUri = uri.replace("bigQuery://", "").split("/");
        const connectionOptions: DPMConfiguration = {
            projectId: parsedUri[0],
            dataset: parsedUri[1],
            tableName: parsedUri[2]
        };
        Object.keys(connectionOptions).forEach((key) => {
            if (!connectionOptions[key]) delete connectionOptions[key];
        });
        return connectionOptions;
    }

    getDefaultParameterValues(configuration: DPMConfiguration): DPMConfiguration {
        return {
            projectId: configuration.projectId || null,
            dataset: configuration.dataset || null,
            tableName: configuration.tableName || null
        };
    }

    async getInspectParameters(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration
    ): Promise<Parameter[]> {
        // TODO Make this use the credentials configuration
        if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            console.log(
                chalk.red(
                    `The Application Default Credentials are not available. They are available if running in Google Compute Engine. Otherwise, the environment variable GOOGLE_APPLICATION_CREDENTIALS must be defined pointing to a file defining the credentials. See https://developers.google.com/accounts/docs/application-default-credentials for more information.`
                )
            );
            process.exit(1);
        }

        const client = new BigQuery();

        const parameters: Parameter[] = [];

        if (connectionConfiguration.uris != null) {
            const parsedUri = this.parseUri((connectionConfiguration.uris as string[])[0]);
            Object.keys(parsedUri).forEach((key) => {
                if (!configuration[key]) {
                    configuration[key] = parsedUri[key];
                }
            });
        }

        const defaultParameterValues: DPMConfiguration = this.getDefaultParameterValues(configuration);

        if (configuration.mode == null) {
            parameters.push({
                configuration,
                type: ParameterType.Select,
                name: "mode",
                message: "Fetch data from a table or a query?",
                options: [
                    {
                        title: "Table",
                        value: "Table",
                        selected: true
                    },
                    {
                        title: "Query",
                        value: "Query"
                    }
                ]
            });
        } else {
            if (configuration.mode === "Table") {
                if (configuration.projectId == null) {
                    const projectId = await this.getProjectId();

                    parameters.push({
                        configuration,
                        type: ParameterType.Select,
                        name: "projectId",
                        message: "Project ID?",
                        options: [{ title: projectId, value: projectId, selected: true }]
                    });
                } else {
                    // Check if project ID is valid one
                    if ((await client.getProjectId()) !== configuration.projectId) {
                        console.log(chalk.red(`\nUnable to detect this Project Id in the current environment\n`));
                        process.exit(1);
                    }
                }

                if (configuration.dataset == null) {
                    const datasets = await this.getDatasets(client);
                    const options = datasets.map((dataset) => ({
                        title: dataset,
                        value: dataset,
                        selected: dataset === defaultParameterValues.dataset
                    }));

                    parameters.push({
                        configuration,
                        type: ParameterType.Select,
                        name: "dataset",
                        message: "Dataset?",
                        options
                    });
                }

                if (configuration.dataset && configuration.tableName == null) {
                    const tables = await this.getTables(client, configuration.dataset as string);
                    const options = tables.map((tableName) => ({
                        title: tableName,
                        value: tableName,
                        selected: tableName === defaultParameterValues.tableName
                    }));

                    parameters.push({
                        configuration,
                        type: ParameterType.Select,
                        name: "tableName",
                        message: "Table Name?",
                        options
                    });
                }
            }

            if (!configuration.query && configuration.mode === "Query") {
                parameters.push({
                    configuration,
                    type: ParameterType.Text,
                    name: "query",
                    message: "Query?",
                    stringMinimumLength: 15,
                    stringRegExp: { pattern: /SELECT/, message: "Should be a SELECT query" }
                });
            }
        }

        return parameters;
    }

    async inspectURIs(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        context: SourceInspectionContext
    ): Promise<InspectionResults> {
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

        const streamSetPreviews: StreamSetPreview[] = [];

        const preview = await this.getRecordStream(configuration, context);

        streamSetPreviews.push(preview);

        return {
            defaultDisplayName:
                configuration.mode === "Table"
                    ? (configuration.tableName as string)
                    : (configuration.dataset as string),
            source: this,
            configuration,
            streamSetPreviews
        };
    }

    async getRecordStream(
        configuration: DPMConfiguration,
        _context: SourceInspectionContext
    ): Promise<StreamSetPreview> {
        const client = new BigQuery();

        const query =
            configuration.mode === "Table"
                ? `SELECT * FROM \`${configuration.projectId}.${configuration.dataset}.${configuration.tableName}\``
                : (configuration.query as string);
        const options = {
            query,
            location: client.location || "US"
        };

        // Get Last Modified Date
        const updateHash = await this.getUpdateHash(client, configuration);

        const fullPath = this.getFullPathFromConfiguration(configuration);

        return {
            configuration,
            streamSummaries: [
                {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    name: fullPath.tableName!,
                    openStream: async () => {
                        return {
                            stream: client.createQueryStream(options),
                            transforms: [
                                new Transform({
                                    objectMode: true,
                                    transform: function (chunk, encoding, callback) {
                                        Object.keys(chunk).forEach((key) => {
                                            if (
                                                chunk[key] instanceof BigQueryDatetime ||
                                                chunk[key] instanceof BigQueryTimestamp
                                            ) {
                                                chunk[key] = chunk[key].value.replace("T", " ");
                                            } else if (typeof chunk[key] === "object") {
                                                delete chunk[key];
                                            }
                                        });
                                        this.push({
                                            record: chunk,
                                            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                                            schemaSlug: fullPath.tableName!
                                        } as RecordContext);
                                        callback();
                                    }
                                })
                            ]
                        };
                    }
                }
            ],
            slug: `${fullPath.tableName}`,
            supportedUpdateMethods: [UpdateMethod.BATCH_FULL_SET],
            updateHash
        };
    }

    private async getProjectId(): Promise<string> {
        let projectId = "";
        try {
            const credentials = fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS as string, "utf-8");
            projectId = JSON.parse(credentials).project_id;
        } catch (err) {
            console.log(chalk.red(err.message));
            process.exit(1);
        }
        return projectId;
    }

    private async getDatasets(client: BigQuery): Promise<string[]> {
        const [datasets] = await client.getDatasets();
        if (datasets.length === 0) {
            console.log(chalk.red("No dataset existing"));
            process.exit(1);
        }
        return datasets.map((dataset) => dataset.id as string);
    }

    private async getTables(client: BigQuery, dataset: string): Promise<string[]> {
        const [tables] = await client.dataset(dataset).getTables();
        if (tables.length === 0) {
            console.log(chalk.red("No table existing"));
            process.exit(1);
        }
        return tables.map((table) => table.id as string);
    }

    private getFullPathFromConfiguration(configuration: DPMConfiguration): FullPath {
        if (configuration.mode === "Table") {
            return {
                projectId: configuration.projectId as string,
                dataset: configuration.dataset as string,
                tableName: configuration.tableName as string
            };
        }
        const ast = sqlParser.parse(configuration.query);
        const from = ast.value.from.value[0].value.value.value.replace(/`/g, "");
        const sections = from.split(".");
        if (sections.length === 3) {
            return {
                projectId: sections[0],
                dataset: sections[1],
                tableName: sections[2]
            };
        }
        return {
            dataset: sections[0],
            tableName: sections[1]
        };
    }

    private async getUpdateHash(client: BigQuery, configuration: DPMConfiguration): Promise<string> {
        let updateHash = new Date().toISOString();
        const fullPath = this.getFullPathFromConfiguration(configuration);
        let from = "";
        if (fullPath.projectId) {
            from = `${fullPath.projectId}.${fullPath.dataset}.__TABLES__`;
        } else {
            from = `${fullPath.dataset}.__TABLES__`;
        }
        const metaQuery = `
			SELECT *, TIMESTAMP_MILLIS(last_modified_time)
			FROM \`${from}\` where table_id = '${fullPath.tableName}'
		`;
        const [result] = await client.query(metaQuery);
        updateHash = new Date(result[0].creation_time).toISOString();
        return updateHash;
    }
}
