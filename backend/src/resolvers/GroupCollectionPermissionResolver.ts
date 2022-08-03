import { EntityManager } from "typeorm";
import { AuthenticatedContext, Context } from "../context";
import { GroupCollectionPermissionEntity } from "../entity/GroupCollectionPermissionEntity";
import { GroupCollectionPermission, CollectionIdentifierInput, Permission } from "../generated/graphql";
import { GroupCollectionPermissionRepository } from "../repository/GroupCollectionPermissionRepository";
import { getCollectionFromCacheOrDbOrFail, collectionEntityToGraphQL, getCollectionFromCacheOrDbById } from "./CollectionResolver";
import { findGroup, getGroupFromCacheOrDbByIdOrFail } from "./GroupResolver";



export const groupCollectionPermissionEntityToGraphqlObject = async (
    context: Context,
    connection: EntityManager,
    groupCollectionPermissionEntity: GroupCollectionPermissionEntity
): Promise<GroupCollectionPermission> => {

    const collectionEntityLoaded = await getCollectionFromCacheOrDbById(context, connection, groupCollectionPermissionEntity.collectionId);

    const groupEntity = await getGroupFromCacheOrDbByIdOrFail(context, connection, groupCollectionPermissionEntity.groupId);

    return {
        creator: groupCollectionPermissionEntity.creator,
        createdAt: groupCollectionPermissionEntity.createdAt,
        group: groupEntity,
        collection: collectionEntityToGraphQL(collectionEntityLoaded),
        permissions: groupCollectionPermissionEntity.permissions,
        updatedAt: groupCollectionPermissionEntity.updatedAt
    };
};

export const addOrUpdateGroupToCollection = async (
        _0: any,
    { groupSlug, collectionIdentifier, permissions }: { groupSlug: string, collectionIdentifier: CollectionIdentifierInput, permissions: Permission[] },
    context: AuthenticatedContext,
    info: any
) => {

    const groupEntity = await findGroup(context.connection.manager, groupSlug);

    const collectionEntity = await getCollectionFromCacheOrDbOrFail(context, context.connection, collectionIdentifier.collectionSlug, []);

    const groupPermission =  await context.connection.manager.getCustomRepository(GroupCollectionPermissionRepository).createOrUpdateGroupCollectionPermission({
        groupId: groupEntity.id,
        collectionId: collectionEntity.id,
        permissions
    });

    return groupCollectionPermissionEntityToGraphqlObject(context, context.connection.manager, groupPermission);

}

export const removeGroupFromCollection = async (
        _0: any,
    { groupSlug, collectionIdentifier }: { groupSlug: string, collectionIdentifier: CollectionIdentifierInput },
    context: AuthenticatedContext,
    info: any
) => {

    await context.connection.transaction(async (manager) => {

        const groupEntity = await findGroup(manager, groupSlug);

        const collectionEntity = await getCollectionFromCacheOrDbOrFail(context, context.connection, collectionIdentifier.collectionSlug, []);

        const groupPermission =  await manager.getRepository(GroupCollectionPermissionEntity).findOneOrFail({
            groupId: groupEntity.id,
            collectionId: collectionEntity.id
        });

        await manager.getRepository(GroupCollectionPermissionEntity).remove(groupPermission);

        return groupCollectionPermissionEntityToGraphqlObject(context, manager, groupPermission);
    });
    

}