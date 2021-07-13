import { Redshift, S3 } from "aws-sdk";
import chalk from "chalk";
import { DPMConfiguration } from "datapm-lib";
import Knex from "knex";
import mime from "mime-types";
import { FileOpenStreamContext, FileStreamContext } from "../parser/ParserUtil";
import {
    createS3Bucket,
    getAwsParameters,
    getRedshiftClusters,
    getRedshiftClusterConfiguration,
    getS3BucketList,
    getStreamFromS3
} from "../util/AwsUtil";
import { Parameter, ParameterType } from "../util/ParameterUtils";
import { AbstractFileStreamSource } from "./AbstractFileStreamSource";
import { S3Source } from "./S3Source";
import { SourceInterface } from "./SourceUtil";

export class RedshiftSource extends AbstractFileStreamSource implements SourceInterface {
    redshiftClient: Redshift;
    s3Client: S3;
    client: Knex;
    clusterList: Redshift.ClusterList = [];

    sourceType(): string {
        return "redshift";
    }

    supportsURI(uri: string): boolean {
        return uri.startsWith("redshift://");
    }

    removeSecretConfigValues(
        configuration: DPMConfiguration
        // eslint-disable-next-line @typescript-eslint/no-empty-function
    ): void {
        ["host", "port", "username", "password"].forEach((key) => delete configuration[key]);
    }

    parseUri(uri: string): Record<string, string> {
        const parts = uri.replace("redshift://", "").split("/");
        const cluster = parts[0] || "";
        return {
            cluster
        };
    }

    async getInspectParameters(configuration: DPMConfiguration): Promise<Parameter[]> {
        const uris = configuration.uris as string[];

        const parsedUri = this.parseUri(uris[0]);
        if (parsedUri.cluster) {
            configuration.cluster = parsedUri.cluster;
        }

        const parameters = await getAwsParameters(configuration);
        if (parameters.length > 0) {
            return parameters;
        }
        this.redshiftClient = new Redshift({ region: configuration.region as string });
        this.s3Client = new S3();

        if (configuration.bucket == null) {
            const bucketList = await getS3BucketList(this.s3Client);
            if (bucketList.length > 0) {
                parameters.push({
                    configuration,
                    type: ParameterType.AutoComplete,
                    name: "bucket",
                    message: "S3 Bucket?",
                    options: bucketList.map((bucket) => ({
                        title: bucket,
                        value: bucket
                    }))
                });
            } else {
                parameters.push({
                    configuration,
                    type: ParameterType.Text,
                    name: "bucket",
                    message: "New S3 Bucket Name?"
                });
            }

            return parameters;
        }
        if (!configuration.cluster) {
            this.clusterList = await getRedshiftClusters(this.redshiftClient);
            if (this.clusterList.length === 0) {
                console.error(chalk.red("No Redshift Clusters Existing!"));
                process.exit(1);
            }
            parameters.push({
                configuration,
                type: ParameterType.AutoComplete,
                name: "cluster",
                message: "Redshift Cluster?",
                options: this.clusterList.map((cluster) => ({
                    title: cluster.ClusterIdentifier as string,
                    value: cluster.ClusterIdentifier as string
                }))
            });

            return parameters;
        }
        this.client = await this.createClient(configuration);

        if (configuration.schema == null) {
            await createS3Bucket(this.s3Client, configuration.region as string, configuration.bucket as string);

            parameters.push({
                configuration,
                type: ParameterType.Text,
                name: "schema",
                message: "Schema?"
            });
            return parameters;
        }
        if (configuration.tables == null) {
            try {
                const tableNames = await this.fetchSchemaTableNames(this.client, configuration.schema as string);
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

        return Knex({
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
        const tables = (configuration.tables as string).split(",");

        for (const table of tables) {
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

            try {
                await this.client.raw(query);
            } catch (error) {
                console.error(chalk.red(error.message));
                process.exit(1);
            }
        }
        return s3PathList;
    }

    async getFileStreams(configuration: DPMConfiguration): Promise<FileStreamContext[]> {
        const uris = configuration.uris as string[];

        // TODO - Support wildcard in paths, to read many files in single batch set
        // A wild card would indicate one set of files for a single stream
        if (uris.length > 1) {
            throw new Error("REDSHIFT_SOURCE_DOES_NOT_SUPPORT_MULTIPLE_URIS");
        }

        const s3PathList: string[] = await this.copyToS3(configuration);
        const s3Source = new S3Source();

        const fileStreamContexts: FileStreamContext[] = await s3Source.getFileStreams({ uris: s3PathList });

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
