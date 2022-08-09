import { EntityManager } from "typeorm";
import { AuthenticatedContext, Context } from "../context";
import { GroupEntity } from "../entity/GroupEntity";
import { GroupPackagePermissionEntity } from "../entity/GroupPackagePermissionEntity";
import { ActivityLogEventType, GroupPackagePermission, PackageIdentifierInput, Permission } from "../generated/graphql";
import { createActivityLog } from "../repository/ActivityLogRepository";
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


    const groupPermission = await context.connection.transaction(async (transactionManager) => {
    
        const groupEntity = await findGroup(transactionManager, groupSlug);

        const packageEntity = await getPackageFromCacheOrDb(context, packageIdentifier, []);

        await createActivityLog(transactionManager, {
            userId: context!.me!.id,
            eventType: ActivityLogEventType.PACKAGE_GROUP_PERMISSION_ADDED_UPDATED,
            targetGroupId: groupEntity.id,
            targetPackageId: packageEntity.id
        });

        return await transactionManager.getCustomRepository(GroupPackagePermissionRepository).createOrUpdateGroupPackagePermission({
            groupId: groupEntity.id,
            packageId: packageEntity.id,
            permissions,
            creatorId: context.me.id
        });

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

        const groupPermission =  await manager.getRepository(GroupPackagePermissionEntity).findOne({
            groupId: groupEntity.id,
            packageId: packageEntity.id
        });

        if(groupPermission == null) {
            throw new Error("NOT_FOUND - The group does not have permission to the package" );
        }

        await createActivityLog(manager, {
            userId: context!.me!.id,
            eventType: ActivityLogEventType.PACKAGE_GROUP_PERMISSION_REMOVED,
            targetGroupId: groupEntity.id,
            targetPackageId: packageEntity.id
        });

        await manager.getRepository(GroupPackagePermissionEntity).remove(groupPermission);

        return groupPackagePermissionEntityToGraphqlObject(context, manager, groupPermission);
    });
    

}