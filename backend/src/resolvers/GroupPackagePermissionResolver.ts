import { EntityManager } from "typeorm";
import { AuthenticatedContext, Context } from "../context";
import { GroupEntity } from "../entity/GroupEntity";
import { GroupPackagePermissionEntity } from "../entity/GroupPackagePermissionEntity";
import { GroupPackagePermission, PackageIdentifierInput, Permission } from "../generated/graphql";
import { GroupPackagePermissionRepository } from "../repository/GroupPackagePermissionRepository";
import { findGroup, getGroupFromCacheOrDbByIdOrFail } from "./GroupResolver";
import { getPackageFromCacheOrDb, getPackageFromCacheOrDbByIdOrFail, packageEntityToGraphqlObject } from "./PackageResolver";



export const groupPackagePermissionEntityToGraphqlObject = async (
    context: Context,
    connection: EntityManager,
    groupPackagePermissionEntity: GroupPackagePermissionEntity
): Promise<GroupPackagePermission> => {
    const packageEntityLoaded = await getPackageFromCacheOrDbByIdOrFail(context, connection, groupPackagePermissionEntity.packageId, true);

    const groupEntity: GroupEntity = await getGroupFromCacheOrDbByIdOrFail(context, connection, groupPackagePermissionEntity.groupId);

    return {
        creator: groupPackagePermissionEntity.creator,
        createdAt: groupPackagePermissionEntity.createdAt,
        group: groupEntity,
        package: await packageEntityToGraphqlObject(context, connection, packageEntityLoaded),
        permissions: groupPackagePermissionEntity.permissions,
        updatedAt: groupPackagePermissionEntity.updatedAt
    };
};

export const addOrUpdateGroupToPackage = async (
        _0: any,
    { groupSlug, packageIdentifier, permissions }: { groupSlug: string, packageIdentifier: PackageIdentifierInput, permissions: Permission[] },
    context: AuthenticatedContext,
    info: any
) => {

    const groupEntity = await findGroup(context.connection.manager, groupSlug);

    const packageEntity = await getPackageFromCacheOrDb(context, packageIdentifier, []);

    const groupPermission =  await context.connection.manager.getCustomRepository(GroupPackagePermissionRepository).createOrUpdateGroupPackagePermission({
        groupId: groupEntity.id,
        packageId: packageEntity.id,
        permissions,
        creatorId: context.me.id
    });

    return groupPackagePermissionEntityToGraphqlObject(context, context.connection.manager, groupPermission);

}

export const removeGroupFromPackage = async (
        _0: any,
    { groupSlug, packageIdentifier }: { groupSlug: string, packageIdentifier: PackageIdentifierInput },
    context: AuthenticatedContext,
    info: any
) => {

    await context.connection.transaction(async (manager) => {

        const groupEntity = await findGroup(manager, groupSlug);

        const packageEntity = await getPackageFromCacheOrDb(context, packageIdentifier, []);

        const groupPermission =  await manager.getRepository(GroupPackagePermissionEntity).findOneOrFail({
            groupId: groupEntity.id,
            packageId: packageEntity.id
        });

        await manager.getRepository(GroupPackagePermissionEntity).remove(groupPermission);

        return groupPackagePermissionEntityToGraphqlObject(context, manager, groupPermission);
    });
    

}