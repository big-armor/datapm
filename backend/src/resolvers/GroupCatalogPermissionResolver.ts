import { EntityManager } from "typeorm";
import { AuthenticatedContext, Context } from "../context";
import { GroupCatalogPermissionEntity } from "../entity/GroupCatalogPermissionEntity";
import { GroupCatalogPermission, CatalogIdentifierInput, Permission } from "../generated/graphql";
import { GroupCatalogPermissionRepository } from "../repository/GroupCatalogPermissionRepository";
import { getCatalogFromCacheOrDbByIdOrFail, getCatalogFromCacheOrDbOrFail, catalogEntityToGraphQL } from "./CatalogResolver";
import { findGroup, getGroupFromCacheOrDbByIdOrFail } from "./GroupResolver";



export const groupCatalogPermissionEntityToGraphqlObject = async (
    context: Context,
    connection: EntityManager,
    groupCatalogPermissionEntity: GroupCatalogPermissionEntity
): Promise<GroupCatalogPermission> => {
    const catalogEntityLoaded = await getCatalogFromCacheOrDbByIdOrFail(context, connection, groupCatalogPermissionEntity.catalogId);

    const groupEntity = await getGroupFromCacheOrDbByIdOrFail(context, connection, groupCatalogPermissionEntity.groupId);

    return {
        creator: groupCatalogPermissionEntity.creator,
        createdAt: groupCatalogPermissionEntity.createdAt,
        group: groupEntity,
        catalog: catalogEntityToGraphQL(catalogEntityLoaded),
        permissions: groupCatalogPermissionEntity.permissions,
        updatedAt: groupCatalogPermissionEntity.updatedAt
    };
};

export const addOrUpdateGroupToCatalog = async (
        _0: any,
    { groupSlug, catalogIdentifier, permissions }: { groupSlug: string, catalogIdentifier: CatalogIdentifierInput, permissions: Permission[] },
    context: AuthenticatedContext,
    info: any
) => {

    const groupEntity = await findGroup(context.connection.manager, groupSlug);

    const catalogEntity = await getCatalogFromCacheOrDbOrFail(context, catalogIdentifier, []);

    const groupPermission =  await context.connection.manager.getCustomRepository(GroupCatalogPermissionRepository).createOrUpdateGroupCatalogPermission({
        groupId: groupEntity.id,
        catalogId: catalogEntity.id,
        permissions
    });

    return groupCatalogPermissionEntityToGraphqlObject(context, context.connection.manager, groupPermission);

}

export const removeGroupFromCatalog = async (
        _0: any,
    { groupSlug, catalogIdentifier }: { groupSlug: string, catalogIdentifier: CatalogIdentifierInput },
    context: AuthenticatedContext,
    info: any
) => {

    await context.connection.transaction(async (manager) => {

        const groupEntity = await findGroup(manager, groupSlug);

        const catalogEntity = await getCatalogFromCacheOrDbOrFail(context, catalogIdentifier, []);

        const groupPermission =  await manager.getRepository(GroupCatalogPermissionEntity).findOneOrFail({
            groupId: groupEntity.id,
            catalogId: catalogEntity.id
        });

        await manager.getRepository(GroupCatalogPermissionEntity).remove(groupPermission);

        return groupCatalogPermissionEntityToGraphqlObject(context, manager, groupPermission);
    });
    

}