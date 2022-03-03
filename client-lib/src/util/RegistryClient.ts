import {
    gql,
    ApolloClient,
    ApolloLink,
    ApolloQueryResult,
    FetchResult,
    HttpLink,
    InMemoryCache,
    NormalizedCacheObject
} from "@apollo/client/core";
import { setContext } from "@apollo/client/link/context";
import * as fetch from "node-fetch";
import {
    Catalog,
    CreatePackageInput,
    CreateVersionInput,
    Package,
    PackageIdentifierInput,
    SearchPackagesResult,
    UpdatePackageInput,
    UpdatePackageDocument,
    MyCatalogsDocument,
    Version
} from "../generated/graphql";
import { RegistryConfig } from "../config/Config";
import { JobContext } from "../main";

export class RegistryClient {
    public registryConfig: RegistryConfig;

    constructor(public _registryConfig: RegistryConfig) {
        this.registryConfig = _registryConfig; // had to for eslint
    }

    getClient(): ApolloClient<NormalizedCacheObject> {
        const httpLink = new HttpLink({
            fetch: (fetch as unknown) as WindowOrWorkerGlobalScope["fetch"],
            uri: `${this.registryConfig.url}/graphql`
        });

        const authLink = setContext((_, { headers }) => {
            // get the authentication token from local storage if it exists
            // return the headers to the context so httpLink can read them

            if (this.registryConfig.apiKey != null) {
                return {
                    headers: {
                        ...headers,
                        "X-API-Key": this.registryConfig.apiKey
                    }
                };
            }

            return {};
        });

        return new ApolloClient({
            link: ApolloLink.from([authLink, httpLink]),
            cache: new InMemoryCache(),
            defaultOptions: {
                mutate: {
                    errorPolicy: "all"
                },
                query: {
                    errorPolicy: "all"
                },
                watchQuery: {
                    errorPolicy: "all"
                }
            }
        });
    }

    async createVersion(
        createVersionInput: CreateVersionInput,
        packageIdentifierInput: PackageIdentifierInput
    ): Promise<FetchResult<{ version: Version }>> {
        const CREATE_VERSION = gql`
            mutation Createversion($value: CreateVersionInput!, $identifier: PackageIdentifierInput!) {
                createVersion(value: $value, identifier: $identifier) {
                    identifier {
                        registryURL
                        catalogSlug
                        packageSlug
                        versionMajor
                        versionMinor
                        versionPatch
                    }
                    packageFile
                    createdAt
                }
            }
        `;

        return this.getClient().mutate<{ version: Version }>({
            mutation: CREATE_VERSION,
            variables: {
                value: createVersionInput,
                identifier: packageIdentifierInput
            },
            errorPolicy: "all"
        });
    }

    async updatePackage(
        packageIdentifier: PackageIdentifierInput,
        updatePackageInput: UpdatePackageInput
    ): Promise<FetchResult<{ package: Package }>> {
        return this.getClient().mutate<{ package: Package }>({
            mutation: UpdatePackageDocument,
            variables: {
                identifier: packageIdentifier,
                value: updatePackageInput
            }
        });
    }

    async createPackage(createPackageInput: CreatePackageInput): Promise<FetchResult<{ package: Package }>> {
        const CREATE_PACKAGE = gql`
            mutation CreatePackage($value: CreatePackageInput!) {
                createPackage(value: $value) {
                    identifier {
                        registryURL
                        catalogSlug
                        packageSlug
                    }
                }
            }
        `;

        return this.getClient().mutate<{ package: Package }>({
            mutation: CREATE_PACKAGE,
            variables: {
                value: createPackageInput
            }
        });
    }

    async getCatalogs(): Promise<ApolloQueryResult<{ myCatalogs: Catalog[] }>> {
        return this.getClient().query<{ myCatalogs: Catalog[] }>({
            query: MyCatalogsDocument
        });
    }

    async getPackage(identifier: PackageIdentifierInput): Promise<ApolloQueryResult<{ package: Package }>> {
        const GET_PACKAGE = gql`
            query GetPackage($identifier: PackageIdentifierInput!) {
                package(identifier: $identifier) {
                    displayName
                    description
                    myPermissions
                    identifier {
                        registryURL
                        catalogSlug
                        packageSlug
                    }
                    versions {
                        identifier {
                            versionMajor
                            versionMinor
                            versionPatch
                        }
                    }
                    latestVersion {
                        identifier {
                            versionMajor
                            versionMinor
                            versionPatch
                        }
                        packageFile
                        canonicalPackageFile
                        updatedAt
                    }
                }
            }
        `;

        return this.getClient().query<{ package: Package }>({
            query: GET_PACKAGE,
            variables: {
                identifier: identifier
            }
        });
    }

    async searchPackages(
        query: string,
        limit: number,
        offset: number
    ): Promise<ApolloQueryResult<{ searchPackages: SearchPackagesResult }>> {
        const SEARCH_QUERY = gql`
            query SearchPackages($query: String!, $limit: Int!, $offset: Int!) {
                searchPackages(query: $query, limit: $limit, offSet: $offset) {
                    count
                    hasMore
                    packages {
                        identifier {
                            catalogSlug
                            packageSlug
                            registryURL
                        }
                        displayName
                        description
                        latestVersion {
                            identifier {
                                versionMajor
                                versionMinor
                                versionPatch
                            }
                        }
                    }
                }
            }
        `;

        return this.getClient().query<{ searchPackages: SearchPackagesResult }>({
            query: SEARCH_QUERY,
            variables: {
                query,
                limit,
                offset
            }
        });
    }
}

export function getRegistryClientWithConfig(jobContext: JobContext, registryRef: { url: string }): RegistryClient {
    const registryConfig = jobContext.getRegistryConfig(registryRef.url);

    if (registryConfig != null) {
        return new RegistryClient(registryConfig);
    }

    return new RegistryClient({ url: registryRef.url });
}
