import { encryptValue } from "../util/EncryptionUtil";
import { CredentialEntity } from "../entity/CredentialEntity";
import { DPMConfiguration } from "datapm-lib";
import { CredentialRepository } from "../repository/CredentialRepository";
import { AuthenticatedContext, Context } from "../context";
import { Credential, CredentialsResult, PackageIdentifierInput } from "../generated/graphql";
import { getGraphQlRelationName } from "../util/relationNames";
import { RepositoryRepository } from "../repository/RepositoryRepository";
import { GraphQLResolveInfo } from "graphql";

export async function credentialEntityToGraphQL(
    context: Context,
    credentialEntity: CredentialEntity
): Promise<Credential> {
    return {
        createdAt: credentialEntity.createdAt,
        updatedAt: credentialEntity.updatedAt,
        credentialIdentifier: credentialEntity.credentialIdentifier,
        creator: credentialEntity.creator
    };
}

export const createCredential = async (
    _0: unknown,
    {
        identifier,
        connectorType,
        repositoryIdentifier,
        credentialIdentifier,
        credential
    }: {
        identifier: PackageIdentifierInput;
        connectorType: string;
        repositoryIdentifier: string;
        credentialIdentifier: string;
        credential: DPMConfiguration;
    },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<Credential> => {
    const graphQLRelationName = info ? getGraphQlRelationName(info) : [];

    const repositoryEntity = await context.connection
        .getCustomRepository(RepositoryRepository)
        .findRepository(identifier, connectorType, repositoryIdentifier);

    if (repositoryEntity == null) throw new Error("REPOSITORY_NOT_FOUND");

    const encryptedCredentials = encryptValue(JSON.stringify(credential));

    const credentialEntity = await context.connection
        .getCustomRepository(CredentialRepository)
        .createOrUpdateCredential(
            repositoryEntity,
            connectorType,
            repositoryIdentifier,
            credentialIdentifier,
            encryptedCredentials,
            context.me
        );

    const returnValue = await context.connection.getRepository(CredentialEntity).findOne(credentialEntity.id, {
        relations: graphQLRelationName
    });

    if (returnValue == null)
        throw new Error(
            "Could not find credential " + credentialEntity.id + " after creating it! This should not happen"
        );

    return credentialEntityToGraphQL(context, returnValue);
};

export const deleteCredential = async (
    _0: unknown,
    {
        identifier,
        connectorType,
        repositoryIdentifier,
        credentialIdentifier
    }: {
        identifier: PackageIdentifierInput;
        connectorType: string;
        repositoryIdentifier: string;
        credentialIdentifier: string;
    },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<void> => {
    return context.connection
        .getCustomRepository(CredentialRepository)
        .deleteCredential(identifier, connectorType, repositoryIdentifier, credentialIdentifier);
};
