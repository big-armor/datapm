import AWS, { Redshift, S3 } from "aws-sdk";
import chalk from "chalk";
import { DPMConfiguration } from "datapm-lib";
import fs from "fs";
import os from "os";
import path from "path";
import readline from "readline";
import { Readable } from "stream";
import { Parameter, ParameterType } from "./parameters/Parameter";

export const RS_NODE_TYPES = [
    "ds2.xlarge",
    "ds2.8xlarge",
    "dc1.large",
    "dc1.8xlarge",
    "dc2.large",
    "dc2.8xlarge",
    "ra3.xlplus",
    "ra3.4xlarge",
    "ra3.16xlarge"
];

export const getAwsProfileList = async (): Promise<string[]> => {
    const awsConfigurationProfilesPath = path.join(os.homedir(), ".aws", "credentials");
    const profiles: string[] = [];

    return new Promise((resolve) => {
        if (!fs.existsSync(awsConfigurationProfilesPath)) {
            return resolve([]);
        }

        const lineReader = readline.createInterface(fs.createReadStream(awsConfigurationProfilesPath));

        lineReader.on("line", (line) => {
            const [, profile] = line.match(/^\[([a-zA-Z0-9-]+)\]$/) ?? ([] as string[]);

            if (profile) {
                profiles.push(profile);
            }
        });

        lineReader.on("close", () => resolve(profiles));
    });
};

export const getAllRegions = async (): Promise<string[]> => {
    AWS.config.update({ region: "us-east-2" });
    const ec2 = new AWS.EC2({ apiVersion: "2016-11-15" });
    const result = await ec2.describeRegions({}).promise();
    return result.Regions?.map((region) => region.RegionName as string) || [];
};

export const getAwsAuthenticationParameters = async (configuration: DPMConfiguration): Promise<Parameter[]> => {
    const parameters: Parameter[] = [];

    if (configuration.awsProfile != null) {
        const credentials = new AWS.SharedIniFileCredentials({ profile: configuration.awsProfile as string });
        process.env.AWS_ACCESS_KEY_ID = credentials.accessKeyId;
        process.env.AWS_SECRET_ACCESS_KEY = credentials.secretAccessKey;
        process.env.AWS_SESSION_TOKEN = credentials.sessionToken;
    }

    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        const profiles = await getAwsProfileList();
        if (profiles.length > 0) {
            parameters.push({
                configuration,
                type: ParameterType.AutoComplete,
                name: "awsProfile",
                message: "AWS Profile?",
                options: profiles.map((profile) => ({
                    title: profile,
                    value: profile
                }))
            });
            return parameters;
        } else {
            if (!process.env.AWS_ACCESS_KEY_ID) {
                parameters.push({
                    configuration: process.env as DPMConfiguration,
                    type: ParameterType.Text,
                    name: "AWS_ACCESS_KEY_ID",
                    message: "AWS Access Key ID?"
                });
            }
            if (!process.env.AWS_SECRET_ACCESS_KEY) {
                parameters.push({
                    configuration: process.env as DPMConfiguration,
                    type: ParameterType.Text,
                    name: "AWS_SECRET_ACCESS_KEY",
                    message: "AWS Secret Access Key?"
                });
            }
            if (!process.env.AWS_SESSION_TOKEN) {
                parameters.push({
                    configuration: process.env as DPMConfiguration,
                    type: ParameterType.Text,
                    name: "AWS_SESSION_TOKEN",
                    message: "AWS Session Token?"
                });
            }
            return parameters;
        }
    }

    if (configuration.region == null) {
        const regions = await getAllRegions();
        parameters.push({
            configuration,
            type: ParameterType.AutoComplete,
            name: "region",
            message: "Region?",
            options: regions.map((region) => ({
                title: region,
                value: region
            }))
        });

        return parameters;
    }

    return parameters;
};

export const getS3BucketList = async (s3Client: S3): Promise<string[]> => {
    try {
        const bucketList = await s3Client.listBuckets().promise();
        if (bucketList.Buckets == null) return [];
        return bucketList.Buckets.map((bucket) => bucket?.Name as string);
    } catch (error) {
        console.error(chalk.red(error.message));
        process.exit(1);
    }
};

export const createS3Bucket = async (s3Client: S3, region: string, bucket: string): Promise<void> => {
    try {
        await s3Client
            .createBucket({
                Bucket: bucket,
                CreateBucketConfiguration: {
                    LocationConstraint: region
                }
            })
            .promise();
    } catch (error) {
        if (error.code !== "BucketAlreadyOwnedByYou") {
            console.error(chalk.red(error.message));
            process.exit(1);
        }
    }
};

export const getS3ObjectMetaData = async (
    s3Client: S3,
    bucket: string,
    key: string
): Promise<S3.HeadObjectOutput | null> => {
    try {
        const params = {
            Bucket: bucket,
            Key: key
        };
        const metaData = await s3Client.headObject(params).promise();
        return metaData;
    } catch (error) {
        if (error.code === "NotFound") {
            return null;
        }
        console.error(chalk.red(error.message));
        process.exit(1);
    }
};

export const getStreamFromS3 = (s3Client: S3, bucket: string, key: string): Readable => {
    const params = {
        Bucket: bucket,
        Key: key
    };
    return s3Client.getObject(params).createReadStream();
};

export const uploadToS3 = async (s3Client: S3, source: string, bucket: string, key: string): Promise<void> => {
    try {
        await s3Client
            .putObject({
                Bucket: bucket,
                Key: key,
                Body: fs.createReadStream(source),
                ACL: "public-read"
            })
            .promise();
    } catch (error) {
        console.error(chalk.red(error.message));
        process.exit(1);
    }
};

export const deleteFromS3 = async (s3Client: S3, bucket: string, key: string): Promise<void> => {
    try {
        await s3Client
            .deleteObject({
                Bucket: bucket,
                Key: key
            })
            .promise();
    } catch (error) {
        console.error(chalk.red(error.message));
        process.exit(1);
    }
};

export const getRedshiftClusters = async (redshiftClient: Redshift): Promise<Redshift.ClusterList> => {
    try {
        const params: Redshift.DescribeClustersMessage = {};
        const clusterList = await redshiftClient.describeClusters(params).promise();
        return clusterList.Clusters || [];
    } catch (error) {
        console.error(chalk.red(error.message));
        process.exit(1);
    }
};

export const getRedshiftClusterConfiguration = async (
    redshiftClient: Redshift,
    clusterIdentifier: string
): Promise<DPMConfiguration> => {
    try {
        const clusters = await getRedshiftClusters(redshiftClient);
        const cluster = clusters.find((cluster) => cluster.ClusterIdentifier === clusterIdentifier);
        const params: Redshift.GetClusterCredentialsMessage = {
            ClusterIdentifier: cluster?.ClusterIdentifier as string,
            DbUser: cluster?.MasterUsername as string
        };
        const credentials = await redshiftClient.getClusterCredentials(params).promise();
        return {
            host: cluster?.Endpoint?.Address as string,
            port: cluster?.Endpoint?.Port as number,
            database: cluster?.DBName as string,
            username: credentials.DbUser as string,
            password: credentials.DbPassword as string
        };
    } catch (error) {
        console.error(chalk.red(error.message));
        process.exit(1);
    }
};
