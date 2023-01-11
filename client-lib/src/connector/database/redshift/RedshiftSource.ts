import { Redshift, S3 } from "aws-sdk";
import { DPMConfiguration, Parameter, ParameterType } from "datapm-lib";
import knex, { Knex } from "knex";
import mime from "mime-types";
import { FileOpenStreamContext, FileStreamContext } from "../../file-based/parser/Parser";
import { createS3Bucket, getRedshiftClusterConfiguration, getStreamFromS3 } from "../../../util/AwsUtil";
import { AbstractFileStreamSource } from "../../file-based/AbstractFileStreamSource";
import { S3Source } from "../../file-based/s3/S3Source";
import { Source } from "../../Source";
import { TYPE } from "./RedshiftConnectorDescription";

export class RedshiftSource extends AbstractFileStreamSource implements Source {
    redshiftClient: Redshift;
    s3Client: S3;
    client: Knex;
    clusterList: Redshift.ClusterList = [];

    sourceType(): string {
        return TYPE;
    }

    supportsURI(uri: string): boolean {
        return uri.startsWith("redshift://");
    }

    async getInspectParameters(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration
    ): Promise<Parameter[]> {
        const parameters: Parameter[] = [];
        this.client = await this.createClient(connectionConfiguration);

        if (configuration.schema == null) {
            await createS3Bucket(
                this.s3Client,
                connectionConfiguration.region as string,
                connectionConfiguration.bucket as string
            );

            parameters.push({
                configuration,
                type: ParameterType.Text,
                name: "schema",
                message: "Schema?"
            });
            return parameters;
        }
        if (configuration.tables == null) {
            const tableNames = await this.fetchSchemaTableNames(this.client, configuration.schema as string);
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

    async createClient(configuration: DPMConfiguration): Promise<Knex> {
        if (!configuration.host) {
            // Get PG Connection Information
            const clusterConfiguration = await getRedshiftClusterConfiguration(
                this.redshiftClient,
                configuration.cluster as string
            );
            ["host", "port", "username", "password", "database"].forEach(
                (key) => (configuration[key] = clusterConfiguration[key])
            );
        }

        return knex({
            client: "pg",
            connection: {
                host: configuration.host,
                port: configuration.port,
                user: configuration.username,
                password: configuration.password,
                database: configuration.database,
                ssl: true
            } as Knex.PgConnectionConfig
        });
    }

    private async fetchSchemaTableNames(client: Knex, schema: string): Promise<string[]> {
        return (await client.select("tablename").from("pg_catalog.pg_tables").where({ schemaname: schema })).map(
            (table) => table.tablename
        );
    }

    async copyToS3(configuration: DPMConfiguration): Promise<string[]> {
        const s3PathList: string[] = [];

        for (const table of configuration.tables as string[]) {
            const s3Path = `s3://${configuration.bucket}/${table}_${Date.now()}_`;
            s3PathList.push(`${s3Path}0000_part_00`);

            const query = `
				unload('select * from "${configuration.schema}"."${table}"')
				to '${s3Path}'
				credentials
				'aws_access_key_id=${process.env.AWS_ACCESS_KEY_ID};aws_secret_access_key=${process.env.AWS_SECRET_ACCESS_KEY}${
                process.env.AWS_SESSION_TOKEN ? `;token=${process.env.AWS_SESSION_TOKEN}` : ""
            }'
				header
				addquotes
				delimiter as ','
			`;

            await this.client.raw(query);
        }
        return s3PathList;
    }

    async getFileStreams(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration
    ): Promise<FileStreamContext[]> {
        const uris = connectionConfiguration.uris as string[];

        // TODO - Support wildcard in paths, to read many files in single batch set
        // A wild card would indicate one set of files for a single stream
        if (uris.length > 1) {
            throw new Error("REDSHIFT_SOURCE_DOES_NOT_SUPPORT_MULTIPLE_URIS");
        }

        const s3PathList: string[] = await this.copyToS3(configuration);
        const s3Source = new S3Source();

        const fileStreamContexts: FileStreamContext[] = await s3Source.getFileStreams(
            connectionConfiguration,
            credentialsConfiguration,
            { uris: s3PathList }
        );

        // This is just a temporary solution
        let readyToDeleteFromS3 = false;

        for (const fileStreamContext of fileStreamContexts) {
            const parsedUri = s3Source.parseUri(fileStreamContext.uri);

            const tableName = fileStreamContext.fileName.replace(/_\d+_\d{4}_part_\d{2}$/, "");
            fileStreamContext.fileName = `${tableName}.csv`;

            const fileOpenStreamContext: FileOpenStreamContext = await fileStreamContext.openStream(null);
            fileStreamContext.openStream = async () => {
                const stream = getStreamFromS3(this.s3Client, parsedUri.bucket, parsedUri.key);
                stream.on("end", async () => {
                    if (!readyToDeleteFromS3) {
                        readyToDeleteFromS3 = true;
                        return;
                    }
                    // Delete all temporary objects from S3
                    const result = await this.s3Client
                        .listObjects({
                            Bucket: configuration.bucket as string,
                            Prefix: tableName
                        })
                        .promise();
                    const objects = result.Contents?.map((object) => ({ Key: object.Key as string }));
                    if (objects && objects.length > 0) {
                        await this.s3Client
                            .deleteObjects({
                                Bucket: configuration.bucket as string,
                                Delete: {
                                    Objects: objects
                                }
                            })
                            .promise();
                    }
                });

                return {
                    stream,
                    fileName: `${tableName}.csv`,
                    fileSize: fileOpenStreamContext.fileSize,
                    lastUpdatedHash: fileOpenStreamContext.lastUpdatedHash,
                    reportedMimeType: mime.lookup(`${tableName}.csv`) || undefined
                };
            };
        }
        return fileStreamContexts;
    }
}
