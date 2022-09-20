import { GraphQLResolveInfo } from "graphql";
import { EntityManager } from "typeorm";
import { AuthenticatedContext, Context } from "../context";
import { GroupCollectionPermissionEntity } from "../entity/GroupCollectionPermissionEntity";
import { UserEntity } from "../entity/UserEntity";
import {
    GroupCollectionPermission,
    CollectionIdentifierInput,
    Permission,
    ActivityLogEventType,
    Group
} from "../generated/graphql";
import { createActivityLog } from "../repository/ActivityLogRepository";
import { GroupCollectionPermissionRepository } from "../repository/GroupCollectionPermissionRepository";
import { getGraphQlRelationName } from "../util/relationNames";
import {
    getCollectionFromCacheOrDbOrFail,
    collectionEntityToGraphQL,
    getCollectionFromCacheOrDbById,
    getCollectionFromCacheOrDbByIdOrFail
} from "./CollectionResolver";
import { findGroup, getGroupFromCacheOrDbByIdOrFail, getGroupFromCacheOrDbBySlugOrFail } from "./GroupResolver";

export const groupCollectionPermissionEntityToGraphqlObject = async (
    context: Context,
    connection: EntityManager,
    groupCollectionPermissionEntity: GroupCollectionPermissionEntity
): Promise<GroupCollectionPermission> => {
    const collectionEntityLoaded = await getCollectionFromCacheOrDbByIdOrFail(
        context,
        connection,
        groupCollectionPermissionEntity.collectionId
    );

    const groupEntity = await getGroupFromCacheOrDbByIdOrFail(
        context,
        connection,
        groupCollectionPermissionEntity.groupId
    );

    return {
        creator: groupCollectionPermissionEntity.creator,
        createdAt: groupCollectionPermissionEntity.createdAt,
        group: groupEntity,
        collection: collectionEntityToGraphQL(collectionEntityLoaded),
        permissions: groupCollectionPermissionEntity.permissions,
        updatedAt: groupCollectionPermissionEntity.updatedAt
    };
};

export const groupsByCollection = async (
    _0: unknown,
    { collectionIdentifier }: { collectionIdentifier: CollectionIdentifierInput },
    context: AuthenticatedContext
): Promise<GroupCollectionPermission[]> => {
    const collectionEntity = await getCollectionFromCacheOrDbOrFail(
        context,
        context.connection.manager,
        collectionIdentifier.collectionSlug,
        []
    );

    const groups = await context.connection.getRepository(GroupCollectionPermissionEntity).find({
        where: {
            collectionId: collectionEntity.id
        }
    });

    return groups.asyncMap((g) =>
        groupCollectionPermissionEntityToGraphqlObject(context, context.connection.manager, g)
    );
};

export const addOrUpdateGroupToCollection = async (
    _0: unknown,
    {
        groupSlug,
        collectionIdentifier,
        permissions
    }: { groupSlug: string; collectionIdentifier: CollectionIdentifierInput; permissions: Permission[] },
    context: AuthenticatedContext
): Promise<GroupCollectionPermission> => {
    return await context.connection.transaction(async (transaction) => {
        const groupEntity = await findGroup(context.connection.manager, groupSlug);

        const collectionEntity = await getCollectionFromCacheOrDbOrFail(
            context,
            context.connection,
            collectionIdentifier.collectionSlug,
            []
        );

        const groupPermission = await context.connection.manager
            .getCustomRepository(GroupCollectionPermissionRepository)
            .createOrUpdateGroupCollectionPermission({
                groupId: groupEntity.id,
                collectionId: collectionEntity.id,
                permissions,
                creatorId: context.me.id
            });

        await createActivityLog(transaction, {
            userId: context.me.id,
            eventType: ActivityLogEventType.COLLECTION_GROUP_PERMISSION_ADDED_UPDATED,
            targetGroupId: groupEntity.id,
            targetCollectionId: collectionEntity.id,
            permissions
        });

        return groupCollectionPermissionEntityToGraphqlObject(context, context.connection.manager, groupPermission);
    });
};

export const removeGroupFromCollection = async (
    _0: unknown,
    { groupSlug, collectionIdentifier }: { groupSlug: string; collectionIdentifier: CollectionIdentifierInput },
    context: AuthenticatedContext
): Promise<void> => {
    await context.connection.transaction(async (manager) => {
        const groupEntity = await findGroup(manager, groupSlug);

        const collectionEntity = await getCollectionFromCacheOrDbOrFail(
            context,
            context.connection,
            collectionIdentifier.collectionSlug,
            []
        );

        const groupPermission = await manager.getRepository(GroupCollectionPermissionEntity).findOne({
            groupId: groupEntity.id,
            collectionId: collectionEntity.id
        });

        if (!groupPermission) {
            throw new Error("NOT_FOUND - Group does not have permission to this collection");
        }

        await createActivityLog(manager, {
            userId: context.me.id,
            eventType: ActivityLogEventType.COLLECTION_GROUP_PERMISSION_REMOVED,
            targetGroupId: groupEntity.id,
            targetCollectionId: collectionEntity.id
        });

        await manager.getRepository(GroupCollectionPermissionEntity).remove(groupPermission);

        return groupCollectionPermissionEntityToGraphqlObject(context, manager, groupPermission);
    });
};

export const collectionPermissionsByGroupForUser = async (
    parent: Group,
    _0: unknown,
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<GroupCollectionPermission[]> => {
    const group = await getGroupFromCacheOrDbBySlugOrFail(context, context.connection, parent.slug);

    const user: UserEntity | undefined = (context as AuthenticatedContext).me;

    const permissions = await context.connection
        .getCustomRepository(GroupCollectionPermissionRepository)
        .collectionPermissionsByGroupForUser({
            groupId: group.id,
            userId: user?.id,
            relations: getGraphQlRelationName(info)
        });

    return permissions.asyncMap((p) =>
        groupCollectionPermissionEntityToGraphqlObject(context, context.connection.manager, p)
    );
};
