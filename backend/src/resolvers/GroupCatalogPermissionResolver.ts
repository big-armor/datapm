import { GraphQLResolveInfo } from "graphql";
import { EntityManager } from "typeorm";
import { AuthenticatedContext, Context } from "../context";
import { GroupCatalogPermissionEntity } from "../entity/GroupCatalogPermissionEntity";
import { UserEntity } from "../entity/UserEntity";
import {
    GroupCatalogPermission,
    CatalogIdentifierInput,
    Permission,
    ActivityLogEventType,
    Group
} from "../generated/graphql";
import { createActivityLog } from "../repository/ActivityLogRepository";
import { GroupCatalogPermissionRepository } from "../repository/GroupCatalogPermissionRepository";
import { getGraphQlRelationName } from "../util/relationNames";
import {
    getCatalogFromCacheOrDbByIdOrFail,
    getCatalogFromCacheOrDbOrFail,
    catalogEntityToGraphQL
} from "./CatalogResolver";
import { findGroup, getGroupFromCacheOrDbByIdOrFail, getGroupFromCacheOrDbBySlugOrFail } from "./GroupResolver";

export const groupCatalogPermissionEntityToGraphqlObject = async (
    context: Context,
    connection: EntityManager,
    groupCatalogPermissionEntity: GroupCatalogPermissionEntity
): Promise<GroupCatalogPermission> => {
    const catalogEntityLoaded = await getCatalogFromCacheOrDbByIdOrFail(
        context,
        connection,
        groupCatalogPermissionEntity.catalogId
    );

    const groupEntity = await getGroupFromCacheOrDbByIdOrFail(
        context,
        connection,
        groupCatalogPermissionEntity.groupId
    );

    return {
        creator: groupCatalogPermissionEntity.creator,
        createdAt: groupCatalogPermissionEntity.createdAt,
        group: groupEntity,
        catalog: catalogEntityToGraphQL(catalogEntityLoaded),
        permissions: groupCatalogPermissionEntity.permissions,
        packagePermissions: groupCatalogPermissionEntity.packagePermissions,
        updatedAt: groupCatalogPermissionEntity.updatedAt
    };
};

export const groupsByCatalog = async (
    _0: unknown,
    { catalogIdentifier }: { catalogIdentifier: CatalogIdentifierInput },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<GroupCatalogPermission[]> => {
    const catalogEntity = await getCatalogFromCacheOrDbOrFail(context, catalogIdentifier, []);

    const groups = await context.connection.getRepository(GroupCatalogPermissionEntity).find({
        where: {
            catalogId: catalogEntity.id
        }
    });

    return groups.asyncMap((g) => groupCatalogPermissionEntityToGraphqlObject(context, context.connection.manager, g));
};

export const addOrUpdateGroupToCatalog = async (
    _0: unknown,
    {
        groupSlug,
        catalogIdentifier,
        permissions,
        packagePermissions
    }: {
        groupSlug: string;
        catalogIdentifier: CatalogIdentifierInput;
        permissions: Permission[];
        packagePermissions: Permission[];
    },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<GroupCatalogPermission> => {
    return context.connection.transaction(async (transaction) => {
        const groupEntity = await findGroup(transaction, groupSlug);

        const catalogEntity = await getCatalogFromCacheOrDbOrFail(context, catalogIdentifier, []);

        const groupPermission = await transaction
            .getCustomRepository(GroupCatalogPermissionRepository)
            .createOrUpdateGroupCatalogPermission({
                groupId: groupEntity.id,
                catalogId: catalogEntity.id,
                permissions,
                creatorId: context.me.id,
                packagePermissions
            });

        await createActivityLog(transaction, {
            userId: context.me.id,
            eventType: ActivityLogEventType.CATALOG_GROUP_PERMISSION_ADDED_UPDATED,
            targetGroupId: groupEntity.id,
            targetCatalogId: catalogEntity.id,
            permissions
        });

        return groupCatalogPermissionEntityToGraphqlObject(context, transaction, groupPermission);
    });
};

export const removeGroupFromCatalog = async (
    _0: unknown,
    { groupSlug, catalogIdentifier }: { groupSlug: string; catalogIdentifier: CatalogIdentifierInput },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<void> => {
    await context.connection.transaction(async (manager) => {
        const groupEntity = await findGroup(manager, groupSlug);

        const catalogEntity = await getCatalogFromCacheOrDbOrFail(context, catalogIdentifier, []);

        const groupPermission = await manager.getRepository(GroupCatalogPermissionEntity).findOne({
            groupId: groupEntity.id,
            catalogId: catalogEntity.id
        });

        if (!groupPermission) {
            throw new Error("NOT_FOUND - Group does not have permission to catalog");
        }

        await manager.getRepository(GroupCatalogPermissionEntity).remove(groupPermission);

        await createActivityLog(manager, {
            userId: context.me.id,
            eventType: ActivityLogEventType.CATALOG_GROUP_PERMISSION_REMOVED,
            targetGroupId: groupEntity.id,
            targetCatalogId: catalogEntity.id
        });
    });
};

export const catalogPermissionsByGroupForUser = async (
    parent: Group,
    _0: unknown,
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<GroupCatalogPermission[]> => {
    const group = await getGroupFromCacheOrDbBySlugOrFail(context, context.connection, parent.slug);

    const user: UserEntity | undefined = (context as AuthenticatedContext).me;

    const permissions = await context.connection
        .getCustomRepository(GroupCatalogPermissionRepository)
        .catalogPermissionsByGroupForUser({
            groupId: group.id,
            userId: user?.id,
            relations: getGraphQlRelationName(info)
        });

    return permissions.asyncMap((p) =>
        groupCatalogPermissionEntityToGraphqlObject(context, context.connection.manager, p)
    );
};
