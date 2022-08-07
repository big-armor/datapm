import { ActivityLogEventType } from "datapm-client-lib";
import { Connection, EntityManager } from "typeorm";
import { AuthenticatedContext, Context } from "../context";
import { GroupEntity } from "../entity/GroupEntity";
import { GroupUserEntity } from "../entity/GroupUserEntity";
import { Permission } from "../generated/graphql";
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

    return await context.connection.transaction(async (manager) => {
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

    return await context.connection.transaction(async (manager) => {
        const groupEntity = await findGroup(manager, groupSlug);

        const userEntity = await getUserFromCacheOrDbByUsername(context, username);

        await createActivityLog(manager, {
            userId: context!.me!.id,
            eventType: ActivityLogEventType.GROUP_MEMBER_PERMISSION_ADDED_UPDATED,
            targetGroupId: groupEntity.id,
            targetUserId: userEntity.id
        });

        return context.connection.getCustomRepository(GroupUserRepository).addOrUpdateUserToGroup({
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
        const groupEntity = await findGroup(manager, groupSlug);
        const userEntity = await getUserFromCacheOrDbByUsername(context, username);

        const groupUserEntity =  await manager.getRepository(GroupUserEntity).findOneOrFail({
            groupId: groupEntity.id,
            userId: userEntity.id,
        });

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


export const findGroup = async (manager: EntityManager, groupSlug: string) => {

    const groupEntity = await manager.getRepository(GroupEntity).findOne({
            where: {
                slug: groupSlug,
            },
        });

    if(groupEntity == null)
        throw new Error("GROUP_NOT_FOUND - " + groupSlug);
    
    return groupEntity;

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