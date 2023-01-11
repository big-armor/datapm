import { Redshift, S3 } from "aws-sdk";
import {
    DPMConfiguration,
    DPMRecordValue,
    PackageFile,
    Properties,
    Schema,
    Parameter,
    ParameterType,
    UpdateMethod
} from "datapm-lib";
import fs from "fs";
import knex, { Knex } from "knex";
import moment from "moment";
import { Transform } from "stream";
import {
    createS3Bucket,
    deleteFromS3,
    getRedshiftClusters,
    getRedshiftClusterConfiguration,
    getS3BucketList,
    uploadToS3
} from "../../../util/AwsUtil";
import { KnexSink } from "../../../connector/database/KnexSink";
import { DISPLAY_NAME, TYPE } from "./RedshiftConnectorDescription";
import { WritableWithContext } from "../../../connector/Sink";
import { JobContext } from "../../../task/JobContext";

export class RedshiftSink extends KnexSink {
    redshiftClient: Redshift;
    s3Client: S3;
    clusterList: Redshift.ClusterList = [];
    fileName = "";

    getType(): string {
        return TYPE;
    }

    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    isStronglyTyped(_configuration: DPMConfiguration): boolean {
        return true;
    }

    getOutputLocationString(
        schema: Schema,
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: Record<string, string | number | boolean | null>
    ): string {
        return `redshift://${connectionConfiguration.cluster}/${configuration.database}?currentSchema=${configuration.schema}`;
    }

    getSafeTableName(name: string): string {
        return name.replace(/[-.]/g, "_");
    }

    filterDefaultConfigValues(
        _catalogSlug: string | undefined,
        _packageFile: PackageFile,
        configuration: Record<string, string | number | boolean | null>
        // eslint-disable-next-line @typescript-eslint/no-empty-function
    ): void {
        ["host", "port", "username", "password"].forEach((key) => delete configuration[key]);
    }

    mapSinkStateKeyToColumnName(stateKey: string): string {
        const map: Record<string, string> = {
            catalogSlug: "catalog_slug",
            packageSlug: "package_slug",
            packageMajorVersion: "package_major_version",
            streamSets: "stream_sets",
            packageVersion: "package_version",
            timestamp: "timestamp"
        };
        return map[stateKey] || stateKey;
    }

    async getParameters(
        catalogSlug: string,
        packageFile: PackageFile,
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        jobContext: JobContext
    ): Promise<Parameter[]> {
        const parameters: Parameter[] = [];

        this.s3Client = new S3();
        this.redshiftClient = new Redshift({ region: configuration.region as string });

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

        if (configuration.cluster == null) {
            this.clusterList = await getRedshiftClusters(this.redshiftClient);
            if (this.clusterList.length === 0) {
                throw new Error("No Redshift Clusters Existing!");
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

        if (configuration.schema == null) {
            parameters.push({
                configuration,
                type: ParameterType.Text,
                name: "schema",
                message: "Schema?"
            });
        }

        if (configuration.schema) {
            delete configuration.awsProfile;
        }

        return parameters;
    }

    async createClient(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration
    ): Promise<Knex> {
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

    async checkDBExistence(_client: Knex, _configuration: DPMConfiguration): Promise<void> {
        //
    }

    getSchemaBuilder(tx: Knex.Transaction | Knex, configuration: DPMConfiguration): Knex.SchemaBuilder {
        return tx.schema.withSchema(configuration.schema as string);
    }

    getStateTableRef(
        tx: Knex.Transaction | Knex,
        configuration: DPMConfiguration
    ): Knex.Ref<string, { [x: string]: string }> {
        return tx.ref(this.stateTableName).withSchema(configuration.schema as string);
    }

    getTableRef(tx: Knex.Transaction | Knex): Knex.Ref<string, { [x: string]: string }> {
        const tableName = this.getSafeTableName(this.schema.title as string);
        return tx.ref(tableName).withSchema(this.configuration.schema as string);
    }

    async createTableFromSchema(transaction: Knex, configuration: DPMConfiguration, schema: Schema): Promise<void> {
        const tableName = this.getSafeTableName(schema.title as string);
        await transaction.schema.withSchema(configuration.schema as string).dropTableIfExists(tableName);
        await transaction.schema.withSchema(configuration.schema as string).createTable(tableName, (tableBuilder) => {
            this.buildTableFromSchema(tableBuilder, schema);
        });
    }

    getCSV(data: { [key: string]: DPMRecordValue }[]): string {
        const properties = this.schema.properties as Properties;
        const columnNames = Object.keys(properties);
        let csvContent = "";
        data.forEach((row) => {
            csvContent += columnNames
                .map((columnName) => {
                    let columnValue = "";
                    if (row[columnName] instanceof Date) {
                        if (Object.keys(properties[columnName].types).includes("date-time")) {
                            columnValue = moment.utc(row[columnName] as string).format("YYYY-MM-DD HH:mm:ss");
                        } else {
                            columnValue = moment.utc(row[columnName] as string).format("YYYY-MM-DD");
                        }
                    } else {
                        columnValue = `${row[columnName] || ""}`;
                    }
                    columnValue = columnValue.replace(/"/g, " ");
                    return `"${columnValue}"`;
                })
                .join(",");
            csvContent += "\n";
        });
        return csvContent;
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
        this.fileName = `${schema.title}_${Date.now()}.csv`;

        // Open a connection to the database
        this.client = await this.createClient(connectionConfiguration, credentialsConfiguration, configuration);

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
            await tx.raw(`CREATE SCHEMA IF NOT EXISTS "${configuration.schema}"`);

            if (replaceExistingData) {
                await tx.raw(
                    `DROP TABLE IF EXISTS "${configuration.schema}"."${this.getSafeTableName(schema.title as string)}"`
                );
            }

            await this.createTableFromSchema(tx, configuration, schema);
        });

        return writable;
    }

    async flushPendingInserts(transform: Transform): Promise<void> {
        fs.appendFileSync(this.fileName, this.getCSV(this.pendingInserts.map((item) => item.insertRecord)));

        if (this.pendingInserts.length > 0)
            transform.push(this.pendingInserts[this.pendingInserts.length - 1].originalRecord);

        this.pendingInserts = [];
    }

    async complete(): Promise<void> {
        await createS3Bucket(this.s3Client, this.configuration.region as string, this.configuration.bucket as string);
        await uploadToS3(this.s3Client, this.fileName, this.configuration.bucket as string, this.fileName);
        fs.unlinkSync(this.fileName);
        await this.copyFromS3();
        await deleteFromS3(this.s3Client, this.configuration.bucket as string, this.fileName);
        this.client.destroy();
    }

    async copyFromS3(): Promise<void> {
        const tableName = this.getSafeTableName(this.schema.title as string);

        const query = `
			copy "${this.configuration.schema}"."${tableName}"
			from 's3://${this.configuration.bucket}/${this.fileName}'
			credentials
			'aws_access_key_id=${process.env.AWS_ACCESS_KEY_ID};aws_secret_access_key=${process.env.AWS_SECRET_ACCESS_KEY}${
            process.env.AWS_SESSION_TOKEN ? `;token=${process.env.AWS_SESSION_TOKEN}` : ""
        }'
			removequotes
			delimiter ','
			timeformat 'auto'
		`;

        await this.client.raw(query);
    }
}
