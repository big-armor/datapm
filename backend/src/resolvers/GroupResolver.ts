import { ActivityLogEventType } from "datapm-client-lib";
import { Connection, EntityManager, Not, Any, Like} from "typeorm";
import { AuthenticatedContext, Context } from "../context";
import { resolveGroupPermissionsForEntity } from "../directive/hasGroupPermissionDirective.ts";
import { GroupEntity } from "../entity/GroupEntity";
import { GroupUserEntity } from "../entity/GroupUserEntity";
import { Group, Permission } from "../generated/graphql";
import { createActivityLog } from "../repository/ActivityLogRepository";
import { GroupUserRepository } from "../repository/GroupUserRepository";

import { getUserFromCacheOrDbByUsername } from "./UserResolver";

export const createGroup = async (
        _0: any,
    { groupSlug, name }: { groupSlug: string, name: string},
    context: AuthenticatedContext,
    info: any
) => {

    return await context.connection.transaction(async (manager) => {
        const groupEntity =  manager.getRepository(GroupEntity).create({
            name,
            slug: groupSlug,
            creatorId: context.me.id,
        });

        const returnEntity =  await manager.save(groupEntity);


        const groupUserEntity =  manager.getRepository(GroupUserEntity).create({
            groupId: returnEntity.id,
            userId: context.me.id,
            creatorId: context.me.id,
            permissions: [Permission.VIEW, Permission.EDIT, Permission.MANAGE],
        });

        manager.save(groupUserEntity);

        await createActivityLog(manager, {
            userId: context!.me!.id,
            eventType: ActivityLogEventType.GROUP_CREATED,
            targetGroupId: groupEntity.id,
        });

        return returnEntity;

    });

}

export const updateGroup = async (
        _0: any,
    { groupSlug, name }: { groupSlug: string, name: string},
    context: AuthenticatedContext,
    info: any
) => {

    return await context.connection.transaction(async (manager) => {
        const groupEntity = await findGroup(manager, groupSlug);

        groupEntity.name = name;

        await createActivityLog(manager, {
            userId: context!.me!.id,
            eventType: ActivityLogEventType.GROUP_EDIT,
            targetGroupId: groupEntity.id,
        });

        return await manager.save(groupEntity);
    });


}

export const deleteGroup = async (
        _0: any,
    { groupSlug }: { groupSlug: string},
    context: AuthenticatedContext,
    info: any
) => {

    await context.connection.transaction(async (manager) => {
        const groupEntity = await findGroup(manager, groupSlug);

        await createActivityLog(manager, {
            userId: context!.me!.id,
            eventType: ActivityLogEventType.GROUP_DELETED,
            targetGroupId: groupEntity.id,
        });

        return await manager.remove(groupEntity);

    })
}

export const addOrUpdateUserToGroup = async (
        _0: any,
    { groupSlug, username, permissions }: { groupSlug: string, username: string, permissions: Permission[] },
    context: AuthenticatedContext,
    info: any
) => {

    if(permissions.length == 0) {
        return removeUserFromGroup(_0,{groupSlug,username},context, info);
    }

    return await context.connection.transaction(async (manager) => {
        const groupEntity = await findGroup(manager, groupSlug);

        const userEntity = await getUserFromCacheOrDbByUsername(context, username);

        await createActivityLog(manager, {
            userId: context!.me!.id,
            eventType: ActivityLogEventType.GROUP_MEMBER_PERMISSION_ADDED_UPDATED,
            targetGroupId: groupEntity.id,
            targetUserId: userEntity.id
        });

        if(!permissions.includes(Permission.MANAGE)) {
            const existingPermission = await manager.getRepository(GroupUserEntity).findOne({
                where: {
                    groupId: groupEntity.id,
                    userId: userEntity.id
                }
            });

            if(existingPermission && existingPermission.permissions.includes(Permission.MANAGE)) {
                await ensureOtherManagers(manager, groupEntity.id, userEntity.id);
            }
        }

        return manager.getCustomRepository(GroupUserRepository).addOrUpdateUserToGroup({
            groupId: groupEntity.id,
            userId: userEntity.id,
            permissions,
            creatorId: context.me.id
        });

    });
}

export const removeUserFromGroup = async (
        _0: any,
    { groupSlug, username }: { groupSlug: string, username: string},
    context: AuthenticatedContext,
    info: any
) => {

    return await context.connection.transaction(async (manager) => {
        const groupEntity = await findGroup(manager, groupSlug );
        const userEntity = await getUserFromCacheOrDbByUsername(context, username);

        const groupUserEntity =  await manager.getRepository(GroupUserEntity).findOneOrFail({
            groupId: groupEntity.id,
            userId: userEntity.id,
        });

        if(groupUserEntity.permissions.includes(Permission.MANAGE)) {
            await ensureOtherManagers(manager, groupEntity.id, userEntity.id);
        }

        await createActivityLog(manager, {
            userId: context!.me!.id,
            eventType: ActivityLogEventType.GROUP_MEMBER_REMOVED,
            targetGroupId: groupEntity.id,
            targetUserId: userEntity.id
        });

        await manager.remove(groupUserEntity);

        return groupEntity;

    })
}

/** Throws an error if there are no users that have the Manage permission on a group, other than the user
 * that is provided. 
 */
async function ensureOtherManagers(entityManager: EntityManager, groupId: number, userId:number ): Promise<void> {
    const otherGroupUsers = await entityManager.getRepository(GroupUserEntity).createQueryBuilder()
        .where('"GroupUserEntity"."group_id" = :groupId AND "GroupUserEntity"."user_id" <> :userId AND "GroupUserEntity"."permissions" @> ARRAY[\'MANAGE\'::user_package_permission_permission_enum]')
        .setParameters({
            userId,
            groupId
        })
        .getOne();

    if(otherGroupUsers == null) {
        throw new Error("NOT_VALID - Can not remove the last manager from the group");
    };
}


export const findGroup = async (manager: EntityManager, groupSlug: string, relations:string[] = []) => {

    const groupEntity = await manager.getRepository(GroupEntity).findOne({
            where: {
                slug: groupSlug,
            },
            relations
        });

    if(groupEntity == null)
        throw new Error("GROUP_NOT_FOUND - " + groupSlug);
    
    return groupEntity;

}

export const myGroups = async (
    _0: any,
    {  }: { },
    context: AuthenticatedContext,
    info: any
) => {

    const groupEntity = await context.connection.getRepository(GroupUserEntity).find({
            where: {
                userId: context.me.id
            },
            relations: ["group"]
        });
    
    return groupEntity.map(us => us.group);

}

export const getGroupFromCacheOrDbByIdOrFail = async (
    context: Context,
    connection: EntityManager | Connection,
    groupId: number,
    forceReload?: boolean,
    relations: string[] = []
) => {
    const groupPromiseFunction = () =>
        connection.getRepository(GroupEntity).findOneOrFail({ id: groupId }, { relations });
    return await context.cache.loadGroup(groupId, groupPromiseFunction, forceReload);
};


export const getGroupFromCacheOrDbBySlugOrFail = async (
    context: Context,
    connection: EntityManager | Connection,
    groupSlug: string,
    forceReload?: boolean,
    relations: string[] = []
) => {
    const groupPromiseFunction = () =>
        connection.getRepository(GroupEntity).findOneOrFail({ slug: groupSlug }, { relations });
    return await context.cache.loadGroupBySlug(groupSlug, groupPromiseFunction, forceReload);
};

export const getGroupPermissionsFromCacheOrDb = async (context: Context, groupId: number, userId: number) => {
    const permissionsPromiseFunction = async () => {

        const userPermissions = await context.connection
            .getRepository(GroupUserEntity)
            .findOne({ groupId, userId });

        if(userPermissions == null)
            return [];

        return userPermissions.permissions;
        
    }
    
    return context.cache.loadGroupPermissionsById(groupId, permissionsPromiseFunction);
};

export const myGroupPermissions = async (parent: Group, _0: any, context: AuthenticatedContext) => {
    const groupEntity = await getGroupFromCacheOrDbBySlugOrFail(context, context.connection.manager, parent.slug);

    return resolveGroupPermissionsForEntity(
        context,
        groupEntity,
        context.me
    );
};


/* export const groupPackages = async (parent: Group, _0: any, context: AuthenticatedContext, info: any) => {
    const group = await getGroupFromCacheOrDbBySlugOrFail(context,context.connection, parent.slug);
    
    const user: UserEntity | undefined = (context as AuthenticatedContext).me;

    const packages = await context.connection.getCustomRepository(PackageRepository).groupPackagesForUser({
        groupId: group.id,
        user,
        relations: getGraphQlRelationName(info)
    });

    return packages.map((p) => packageEntityToGraphqlObject(context, context.connection, p));
};

*/