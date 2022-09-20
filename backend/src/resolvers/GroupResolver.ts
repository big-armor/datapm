import { ValidationError } from "apollo-server";
import { ActivityLogEventType, SearchGroupsResult, UserStatus } from "datapm-client-lib";
import { emailAddressValid } from "datapm-lib";
import { GraphQLResolveInfo } from "graphql";
import { Connection, EntityManager } from "typeorm";
import { AuthenticatedContext, Context } from "../context";
import { resolveGroupPermissionsForEntity } from "../directive/hasGroupPermissionDirective.ts";
import { GroupEntity } from "../entity/GroupEntity";
import { GroupUserEntity } from "../entity/GroupUserEntity";
import { UserEntity } from "../entity/UserEntity";
import { Group, GroupUser, Permission, SetUserGroupPermissionsInput } from "../generated/graphql";
import { createActivityLog } from "../repository/ActivityLogRepository";
import { GroupRepository } from "../repository/GroupRepository";
import { GroupUserRepository } from "../repository/GroupUserRepository";
import { UserRepository } from "../repository/UserRepository";
import { asyncForEach } from "../util/AsyncUtils";
import { getGraphQlRelationName } from "../util/relationNames";
import { sendInviteUser, sendShareNotification } from "../util/smtpUtil";

import { getUserFromCacheOrDbByUsernameOrFail } from "./UserResolver";
const GROUP_SEARCH_RESULT_LIMIT = 100;

export const createGroup = async (
    _0: unknown,
    { groupSlug, name, description }: { groupSlug: string; name: string; description: string },
    context: AuthenticatedContext
): Promise<Group> => {
    return await context.connection.transaction(async (manager) => {
        const existingGroup = await manager.getRepository(GroupEntity).findOne({
            where: {
                slug: groupSlug
            }
        });

        if (existingGroup != null) {
            throw new Error("NOT_UNIQUE - Group slug already exists");
        }

        const groupEntity = manager.getRepository(GroupEntity).create({
            name,
            slug: groupSlug,
            description,
            creatorId: context.me.id
        });

        const returnEntity = await manager.save(groupEntity);

        const groupUserEntity = manager.getRepository(GroupUserEntity).create({
            groupId: returnEntity.id,
            userId: context.me.id,
            creatorId: context.me.id,
            permissions: [Permission.VIEW, Permission.EDIT, Permission.MANAGE]
        });

        manager.save(groupUserEntity);

        await createActivityLog(manager, {
            userId: context.me.id,
            eventType: ActivityLogEventType.GROUP_CREATED,
            targetGroupId: groupEntity.id
        });

        return returnEntity;
    });
};

export const updateGroup = async (
    _0: unknown,
    { groupSlug, name, description }: { groupSlug: string; name: string; description: string },
    context: AuthenticatedContext
): Promise<Group> => {
    return await context.connection.transaction(async (manager) => {
        const groupEntity = await findGroup(manager, groupSlug);

        groupEntity.name = name;
        groupEntity.description = description;

        await createActivityLog(manager, {
            userId: context.me.id,
            eventType: ActivityLogEventType.GROUP_EDIT,
            targetGroupId: groupEntity.id
        });

        return await manager.save(groupEntity);
    });
};

export const deleteGroup = async (
    _0: unknown,
    { groupSlug }: { groupSlug: string },
    context: AuthenticatedContext
): Promise<void> => {
    await context.connection.transaction(async (manager) => {
        const groupEntity = await findGroup(manager, groupSlug);

        await createActivityLog(manager, {
            userId: context.me.id,
            eventType: ActivityLogEventType.GROUP_DELETED,
            targetGroupId: groupEntity.id
        });

        return await manager.remove(groupEntity);
    });
};

export const addOrUpdateUserToGroup = async (
    _0: unknown,
    { groupSlug, userPermissions }: { groupSlug: string; userPermissions: SetUserGroupPermissionsInput[] },
    context: AuthenticatedContext
): Promise<void> => {
    const inviteUsers: UserEntity[] = [];
    const existingUsers: UserEntity[] = [];
    const groupEntity = await findGroup(context.connection.manager, groupSlug);

    await context.connection.transaction(async (manager) => {
        for (const userPermission of userPermissions) {
            const permissions = userPermission.permissions;
            const usernameOrEmail = userPermission.usernameOrEmailAddress;

            let userEntity = await manager
                .getCustomRepository(UserRepository)
                .getUserByUsernameOrEmailAddress(usernameOrEmail);

            if (userEntity == null) {
                if (emailAddressValid(userPermission.usernameOrEmailAddress) === true) {
                    const inviteUser = await context.connection
                        .getCustomRepository(UserRepository)
                        .createInviteUser(userPermission.usernameOrEmailAddress);

                    inviteUsers.push(inviteUser);
                    userEntity = inviteUser;
                } else {
                    throw new ValidationError("USER_NOT_FOUND - " + userPermission.usernameOrEmailAddress);
                }
            } else {
                if (permissions.length === 0) {
                    await removeUserFromGroup(_0, { groupSlug, username: userEntity.username }, context);
                    continue;
                } else if (userEntity.status === UserStatus.PENDING_SIGN_UP) {
                    inviteUsers.push(userEntity);
                } else {
                    existingUsers.push(userEntity);
                }
            }

            await createActivityLog(manager, {
                userId: context.me.id,
                eventType: ActivityLogEventType.GROUP_MEMBER_PERMISSION_ADDED_UPDATED,
                targetGroupId: groupEntity.id,
                targetUserId: userEntity.id,
                permissions
            });

            if (!permissions.includes(Permission.MANAGE)) {
                const existingPermission = await manager.getRepository(GroupUserEntity).findOne({
                    where: {
                        groupId: groupEntity.id,
                        userId: userEntity.id
                    }
                });

                if (existingPermission && existingPermission.permissions.includes(Permission.MANAGE)) {
                    await ensureOtherManagers(manager, groupEntity.id, userEntity.id);
                }
            }

            await manager.getCustomRepository(GroupUserRepository).addOrUpdateUserToGroup({
                groupId: groupEntity.id,
                userId: userEntity.id,
                permissions,
                creatorId: context.me.id
            });
        }
    });

    await asyncForEach(existingUsers, async (user) => {
        await sendShareNotification(
            user,
            context.me.displayName,
            groupEntity.name,
            "/group/" + groupEntity.slug,
            "You have been added to the group " +
                groupEntity.name +
                ". This means you now have access to data and other resources to which the group has been assigned."
        );
    });
    await asyncForEach(inviteUsers, async (user) => {
        await sendInviteUser(
            user,
            context.me.displayName,
            group.name,
            "You have been added to the group named " + groupEntity.name + "."
        );
    });
};

export const removeUserFromGroup = async (
    _0: unknown,
    { groupSlug, username }: { groupSlug: string; username: string },
    context: AuthenticatedContext
): Promise<Group> => {
    return await context.connection.transaction(async (manager) => {
        const groupEntity = await findGroup(manager, groupSlug);
        const userEntity = await getUserFromCacheOrDbByUsernameOrFail(context, username);

        const groupUserEntity = await manager.getRepository(GroupUserEntity).findOneOrFail({
            groupId: groupEntity.id,
            userId: userEntity.id
        });

        if (groupUserEntity.permissions.includes(Permission.MANAGE)) {
            await ensureOtherManagers(manager, groupEntity.id, userEntity.id);
        }

        await createActivityLog(manager, {
            userId: context.me.id,
            eventType: ActivityLogEventType.GROUP_MEMBER_REMOVED,
            targetGroupId: groupEntity.id,
            targetUserId: userEntity.id
        });

        await manager.remove(groupUserEntity);

        return groupEntity;
    });
};

/** Throws an error if there are no users that have the Manage permission on a group, other than the user
 * that is provided.
 */
async function ensureOtherManagers(entityManager: EntityManager, groupId: number, userId: number): Promise<void> {
    const otherGroupUsers = await entityManager
        .getRepository(GroupUserEntity)
        .createQueryBuilder()
        .where(
            '"GroupUserEntity"."group_id" = :groupId AND "GroupUserEntity"."user_id" <> :userId AND "GroupUserEntity"."permissions" @> ARRAY[\'MANAGE\'::user_package_permission_permission_enum]'
        )
        .setParameters({
            userId,
            groupId
        })
        .getOne();

    if (otherGroupUsers == null) {
        throw new Error("NOT_VALID - Can not remove the last manager from the group");
    }
}

export const findGroup = async (
    manager: EntityManager,
    groupSlug: string,
    relations: string[] = []
): Promise<GroupEntity> => {
    const groupEntity = await manager.getRepository(GroupEntity).findOne({
        where: {
            slug: groupSlug
        },
        relations
    });

    if (groupEntity == null) throw new Error("GROUP_NOT_FOUND - " + groupSlug);

    return groupEntity;
};

export const myGroups = async (_0: unknown, _1: unknown, context: AuthenticatedContext): Promise<Group[]> => {
    const groupEntity = await context.connection.getRepository(GroupUserEntity).find({
        where: {
            userId: context.me.id
        },
        relations: ["group"]
    });

    return groupEntity.map((us) => us.group);
};

export const group = async (
    _0: unknown,
    { groupSlug }: { groupSlug: string },
    context: AuthenticatedContext
): Promise<GroupEntity> => {
    const groupEntity = await context.connection.getRepository(GroupEntity).findOne({
        where: {
            slug: groupSlug
        }
    });

    if (groupEntity == null) throw new Error("GROUP_NOT_FOUND - " + groupSlug);

    return groupEntity;
};

export const getGroupFromCacheOrDbByIdOrFail = async (
    context: Context,
    connection: EntityManager | Connection,
    groupId: number,
    forceReload?: boolean,
    relations: string[] = []
): Promise<GroupEntity> => {
    const groupPromiseFunction = () =>
        connection.getRepository(GroupEntity).findOneOrFail({ id: groupId }, { relations });
    const response = await context.cache.loadGroup(groupId, groupPromiseFunction, forceReload);

    if (response == null) throw new Error("GROUP_NOT_FOUND - " + groupId);

    return response;
};

export const getGroupFromCacheOrDbBySlugOrFail = async (
    context: Context,
    connection: EntityManager | Connection,
    groupSlug: string,
    forceReload?: boolean,
    relations: string[] = []
): Promise<GroupEntity> => {
    const groupPromiseFunction = async () => {
        const group = await connection.getRepository(GroupEntity).findOne({ slug: groupSlug }, { relations });

        if (group === undefined) throw new Error("GROUP_NOT_FOUND - " + groupSlug);

        return group;
    };
    const response = await context.cache.loadGroupBySlug(groupSlug, groupPromiseFunction, forceReload);

    if (response == null) throw new Error("GROUP_NOT_FOUND - " + groupSlug);

    return response;
};

export const getGroupPermissionsFromCacheOrDb = async (
    context: Context,
    groupId: number,
    userId: number
): Promise<Permission[]> => {
    const permissionsPromiseFunction = async () => {
        const userPermissions = await context.connection.getRepository(GroupUserEntity).findOne({ groupId, userId });

        if (userPermissions == null) return [];

        return userPermissions.permissions;
    };

    return (await context.cache.loadGroupPermissionsById(groupId, permissionsPromiseFunction)) || [];
};

export const myGroupPermissions = async (
    parent: Group,
    _0: unknown,
    context: AuthenticatedContext
): Promise<Permission[]> => {
    const groupEntity = await getGroupFromCacheOrDbBySlugOrFail(context, context.connection.manager, parent.slug);

    return resolveGroupPermissionsForEntity(context, groupEntity, context.me);
};

export const groupUsers = async (
    parent: Group,
    _0: unknown,
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<GroupUser[]> => {
    const group = await getGroupFromCacheOrDbBySlugOrFail(context, context.connection, parent.slug);

    const groupUsers = await context.connection.getRepository(GroupUserEntity).find({
        where: {
            groupId: group.id
        },
        relations: getGraphQlRelationName(info)
    });

    return groupUsers;
};

export const setGroupAsAdmin = async (
    _0: unknown,
    { groupSlug, isAdmin }: { groupSlug: string; isAdmin: boolean },
    context: AuthenticatedContext
): Promise<void> => {
    await context.connection.transaction(async (manager) => {
        const group = await getGroupFromCacheOrDbBySlugOrFail(context, manager, groupSlug);

        group.isAdmin = isAdmin;

        await manager.save(group);
    });
};

export const adminSearchGroups = async (
    _0: unknown,
    { value, limit, offSet }: { value: string; limit: number; offSet: number },
    context: AuthenticatedContext
): Promise<SearchGroupsResult> => {
    const clampedLimit = Math.min(limit, GROUP_SEARCH_RESULT_LIMIT);
    const [searchResponse, count] = await context.connection.manager
        .getCustomRepository(GroupRepository)
        .searchWithNoRestrictions({ value, limit: clampedLimit, offSet });

    return {
        hasMore: count - (offSet + clampedLimit) > 0,
        groups: searchResponse,
        count
    };
};

export const adminDeleteGroup = async (
    _0: unknown,
    { groupSlug }: { groupSlug: string },
    context: AuthenticatedContext
): Promise<void> => {
    await context.connection.getRepository(GroupEntity).delete({
        slug: groupSlug
    });
};
