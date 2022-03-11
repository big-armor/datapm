import { Redshift, S3 } from "aws-sdk";
import { DPMConfiguration, Parameter, ParameterType } from "datapm-lib";
import { getAwsAuthenticationParameters, getRedshiftClusters, getS3BucketList } from "../../../util/AwsUtil";
import { Connector } from "../../Connector";
import { TYPE } from "./RedshiftConnectorDescription";

export class RedshiftRepository implements Connector {
    getType(): string {
        return TYPE;
    }

    requiresConnectionConfiguration(): boolean {
        return true;
    }

    userSelectableConnectionHistory(): boolean {
        return true;
    }

    requiresCredentialsConfiguration(): boolean {
        return true;
    }

    async getRepositoryIdentifierFromConfiguration(_configuration: DPMConfiguration): Promise<string> {
        return "Redshift"; // TODO Should probably move these from Source and Sink implementations to here
    }

    async getCredentialsIdentifierFromConfiguration(_configuration: DPMConfiguration): Promise<string> {
        return "Environment Variables"; // TODO Should probably move these from Source and Sink implementations to here
    }

    parseUri(uri: string): Record<string, string> {
        const parts = uri.replace("redshift://", "").split("/");
        const cluster = parts[0] || "";
        return {
            cluster
        };
    }

    async getConnectionParameters(connectionConfiguration: DPMConfiguration): Promise<Parameter[]> {
        const uris = connectionConfiguration.uris as string[];

        const parsedUri = this.parseUri(uris[0]);
        if (parsedUri.cluster) {
            connectionConfiguration.cluster = parsedUri.cluster;
        }

        const parameters: Parameter[] = [];

        const redshiftClient = new Redshift({ region: connectionConfiguration.region as string });
        const s3Client = new S3();

        if (connectionConfiguration.bucket == null) {
            const bucketList = await getS3BucketList(s3Client);
            if (bucketList.length > 0) {
                parameters.push({
                    configuration: connectionConfiguration,
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
                    configuration: connectionConfiguration,
                    type: ParameterType.Text,
                    name: "bucket",
                    message: "New S3 Bucket Name?"
                });
            }

            return parameters;
        }
        if (!connectionConfiguration.cluster) {
            const clusterList = await getRedshiftClusters(redshiftClient);
            if (clusterList.length === 0) {
                throw new Error("No Redshift Clusters Existing!");
            }
            parameters.push({
                configuration: connectionConfiguration,
                type: ParameterType.AutoComplete,
                name: "cluster",
                message: "Redshift Cluster?",
                options: clusterList.map((cluster) => ({
                    title: cluster.ClusterIdentifier as string,
                    value: cluster.ClusterIdentifier as string
                }))
            });

            return parameters;
        }
        return [];
    }

    async getCredentialsParameters(
        _connectionConfiguration: DPMConfiguration,
        authenticationConfiguration: DPMConfiguration
    ): Promise<Parameter[]> {
        const parameters = await getAwsAuthenticationParameters(authenticationConfiguration);
        return parameters;
    }

    async testConnection(_connectionConfiguration: DPMConfiguration): Promise<string | true> {
        return true;
    }

    async testCredentials(
        _connectionConfiguration: DPMConfiguration,
        _authenticationConfiguration: DPMConfiguration
    ): Promise<string | true> {
        return true; // TODO test AWS authentication
    }
}
