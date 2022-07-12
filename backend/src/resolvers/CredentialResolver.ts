import { encryptValue } from "../util/EncryptionUtil";
import { CredentialEntity } from "../entity/CredentialEntity";
import { DPMConfiguration } from "datapm-lib";
import { CredentialRepository } from "../repository/CredentialRepository";
import { AuthenticatedContext, Context } from "../context";
import { Credential, CredentialsResult, PackageIdentifierInput } from "../generated/graphql";
import { getGraphQlRelationName } from "../util/relationNames";
import { getPackageFromCacheOrDb, packageEntityToGraphqlObject } from "./PackageResolver";

async function credentialEntityToGraphQL(
    context:Context,
    credentialEntity: CredentialEntity
): Promise<Credential> {

    return {
        package: await packageEntityToGraphqlObject(context, context.connection, credentialEntity.package),
        createdAt: credentialEntity.createdAt,
        sourceSlug: credentialEntity.sourceSlug,
        sourceType: credentialEntity.sourceType,
        updatedAt: credentialEntity.updatedAt,
        credentialIdentifier: credentialEntity.credentialIdentifier,
        creator: credentialEntity.creator
    }

}


export const createCredential = async (
        _0: any,
    { identifier, sourceSlug, sourceType, credentialIdentifier, credential }: { identifier: PackageIdentifierInput; sourceSlug: string, sourceType: string, credentialIdentifier: string, credential: DPMConfiguration },
    context: AuthenticatedContext,
    info: any
) => {
    const graphQLRelationName = info ? getGraphQlRelationName(info) : [];
    const packageEntity = await getPackageFromCacheOrDb(
        context,
        identifier,
        graphQLRelationName
    );

    const encryptedCredentials = encryptValue(JSON.stringify(credential));

    const credentialEntity = await context.connection.getCustomRepository(CredentialRepository).createCredential(
        packageEntity,
        sourceSlug,
        sourceType,
        credentialIdentifier,
        encryptedCredentials,
        context.me
    )

    const returnValue = await context.connection.getRepository(CredentialEntity).findOne(credentialEntity.id, {
        relations: graphQLRelationName
    });

    if(returnValue == null)
        throw new Error("Could not find credential " + credentialEntity.id + " after creating it! This should not happen")
    
    return credentialEntityToGraphQL(context, returnValue);

}

export const listCredentials = async (
        _0: any,
    { identifier, limit, offset }: { identifier: PackageIdentifierInput; limit: number, offset: number },
    context: AuthenticatedContext,
    info: any
): Promise<CredentialsResult> => {
    
    const graphQLRelationName = info ? getGraphQlRelationName(info) : [];

    const packageEntity = await getPackageFromCacheOrDb(
        context,
        identifier,
        graphQLRelationName
    );

    const credentialRelations = graphQLRelationName.map(r => r.replace(/^credentials\.?/,"")).filter(r => r.length > 0);

    const [credentials, count] = await context.connection.getCustomRepository(CredentialRepository).packageCredentials({
        packageEntity,
        limit,
        offset,
        relations: credentialRelations
    });

    return {
        credentials: await credentials.asyncMap(async (c) => await credentialEntityToGraphQL(context, c)),
        count,
        hasMore: count - (limit + offset) > 0
    };
}

export const deleteCredential = async (
        _0: any,
    { identifier, sourceSlug, sourceType, credentialIdentifier }: { identifier: PackageIdentifierInput; sourceSlug: string, sourceType: string, credentialIdentifier: string},
    context: AuthenticatedContext,
    info: any
) => {
 
    return context.connection.getCustomRepository(CredentialRepository).deleteCredential(
        identifier,
        sourceSlug,
        sourceType,
        credentialIdentifier
    );
}