import { DPMConfiguration } from "datapm-lib";
import { AuthenticatedContext, Context } from "../context";
import { PackageIdentifierInput, RepositoriesResult, Repository } from "../generated/graphql";
import { getGraphQlRelationName } from "../util/relationNames";
import { getPackageFromCacheOrDbOrFail, packageEntityToGraphqlObject } from "./PackageResolver";
import { RepositoryEntity } from "../entity/RepositoryEntity";
import { RepositoryRepository } from "../repository/RepositoryRepository";
import { credentialEntityToGraphQL } from "./CredentialResolver";
import { GraphQLResolveInfo } from "graphql";

async function repositoryEntityToGraphQL(context: Context, repositoryEntity: RepositoryEntity): Promise<Repository> {
    return {
        package: await packageEntityToGraphqlObject(context, context.connection, repositoryEntity.package),
        createdAt: repositoryEntity.createdAt,
        repositoryIdentifier: repositoryEntity.repositoryIdentifier,
        connectorType: repositoryEntity.connectorType,
        updatedAt: repositoryEntity.updatedAt,
        creator: repositoryEntity.creator,
        credentials: repositoryEntity.credentials
            ? await repositoryEntity.credentials.asyncMap((c) => credentialEntityToGraphQL(context, c))
            : undefined
    };
}

export const createRepository = async (
    _0: unknown,
    {
        identifier,
        connectorType,
        repositoryIdentifier,
        connectionConfiguration
    }: {
        identifier: PackageIdentifierInput;
        connectorType: string;
        repositoryIdentifier: string;
        connectionConfiguration: DPMConfiguration;
    },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<Repository> => {
    const graphQLRelationName = info ? getGraphQlRelationName(info) : [];
    const packageEntity = await getPackageFromCacheOrDbOrFail(context, identifier, graphQLRelationName);

    const repositoryEntity = await context.connection
        .getCustomRepository(RepositoryRepository)
        .createOrUpdateRepository(
            packageEntity,
            connectorType,
            repositoryIdentifier,
            connectionConfiguration,
            context.me
        );

    const returnValue = await context.connection.getRepository(RepositoryEntity).findOne(repositoryEntity.id, {
        relations: graphQLRelationName
    });

    if (returnValue == null)
        throw new Error(
            "Could not find repository " + repositoryEntity.id + " after creating it! This should not happen"
        );

    return repositoryEntityToGraphQL(context, returnValue);
};

export const listRepositories = async (
    _0: unknown,
    { identifier, limit, offset }: { identifier: PackageIdentifierInput; limit: number; offset: number },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<RepositoriesResult> => {
    const graphQLRelationName = info ? getGraphQlRelationName(info) : [];

    const packageEntity = await getPackageFromCacheOrDbOrFail(context, identifier, graphQLRelationName);

    const credentialRelations = graphQLRelationName
        .map((r) => r.replace(/^repositories\.?/, ""))
        .filter((r) => r.length > 0);

    const [credentials, count] = await context.connection
        .getCustomRepository(RepositoryRepository)
        .packageRepositories({
            packageEntity,
            limit,
            offset,
            relations: credentialRelations
        });

    return {
        repositories: await credentials.asyncMap(async (c) => await repositoryEntityToGraphQL(context, c)),
        count,
        hasMore: count - (limit + offset) > 0
    };
};

export const deleteRepository = async (
    _0: unknown,
    {
        identifier,
        connectorType,
        repositoryIdentifier
    }: { identifier: PackageIdentifierInput; connectorType: string; repositoryIdentifier: string },
    context: AuthenticatedContext
): Promise<void> => {
    return context.connection
        .getCustomRepository(RepositoryRepository)
        .deleteRepository(identifier, connectorType, repositoryIdentifier);
};
