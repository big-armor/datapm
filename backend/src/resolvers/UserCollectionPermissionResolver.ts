import { AuthenticatedContext, Context } from "../context";
import {
    Permission,
    CollectionIdentifierInput,
    SetUserCollectionPermissionsInput,
    UserStatus
} from "../generated/graphql";
import { UserCollectionPermissionRepository } from "../repository/UserCollectionPermissionRepository";
import { EntityManager } from "typeorm";
import { CollectionEntity } from "../entity/CollectionEntity";
import { UserEntity } from "../entity/UserEntity";
import { UserRepository } from "../repository/UserRepository";
import { emailAddressValid } from "datapm-lib";
import { sendInviteUser, sendShareNotification, validateMessageContents } from "../util/smtpUtil";
import { CollectionRepository } from "../repository/CollectionRepository";
import { asyncForEach } from "../util/AsyncUtils";
import { ValidationError } from "apollo-server";
import { getCollectionFromCacheOrDbOrFail } from "./CollectionResolver";
import { deleteCollectionFollowByUserId } from "./FollowResolver";
import { isAuthenticatedContext } from "../util/contextHelpers";
import { GroupCollectionPermissionRepository } from "../repository/GroupCollectionPermissionRepository";
import { createActivityLog } from "../repository/ActivityLogRepository";
import { ActivityLogEventType, UserCollectionPermissions } from "datapm-client-lib";
import { UserCollectionPermissionEntity } from "../entity/UserCollectionPermissionEntity";

export const hasCollectionPermissions = async (
    context: Context,
    collection: CollectionEntity,
    permission: Permission
): Promise<boolean> => {
    if (permission === Permission.VIEW) {
        if (collection?.isPublic) return true;
    }

    if (!isAuthenticatedContext(context)) {
        return false;
    }

    const permissions = await getCollectionPermissionsFromCacheOrDb(context, collection);

    return permissions?.includes(permission) || false;
};

export const grantAllCollectionPermissionsForUser = async (
    transaction: EntityManager,
    userId: number,
    collectionId: number
): Promise<UserCollectionPermissionEntity> => {
    return transaction
        .getCustomRepository(UserCollectionPermissionRepository)
        .grantAllPermissionsForUser(userId, collectionId);
};

export const setPermissionsForUser = async (
    context: AuthenticatedContext,
    collectionId: number,
    permissions: Permission[]
): Promise<UserCollectionPermissionEntity> => {
    return context.connection
        .getCustomRepository(UserCollectionPermissionRepository)
        .setPermissionsForUser(context.me.id, collectionId, permissions);
};

export const setUserCollectionPermissions = async (
    _0: unknown,
    {
        identifier,
        value,
        message
    }: { identifier: CollectionIdentifierInput; value: SetUserCollectionPermissionsInput[]; message: string },
    context: AuthenticatedContext
): Promise<void> => {
    validateMessageContents(message);

    const collectionEntity = await context.connection
        .getCustomRepository(CollectionRepository)
        .findCollectionBySlugOrFail(identifier.collectionSlug);

    const inviteUsers: UserEntity[] = [];
    const existingUsers: UserEntity[] = [];

    await context.connection.transaction(async (transaction) => {
        await asyncForEach(value, async (userCollectionPermission) => {
            let user = await transaction
                .getCustomRepository(UserRepository)
                .getUserByUsernameOrEmailAddress(userCollectionPermission.usernameOrEmailAddress);

            const collectionPermissionRepository = transaction.getCustomRepository(UserCollectionPermissionRepository);
            if (userCollectionPermission.permissions.length === 0) {
                if (!user) {
                    return;
                }

                if (!collectionEntity.isPublic) {
                    await deleteCollectionFollowByUserId(transaction, collectionEntity.id, user.id);
                }
                await collectionPermissionRepository.deleteUserCollectionPermissionsForUser({
                    identifier,
                    user
                });

                await createActivityLog(transaction, {
                    userId: context.me.id,
                    eventType: ActivityLogEventType.COLLECTION_USER_PERMISSION_REMOVED,
                    targetCollectionId: collectionEntity.id,
                    targetUserId: user.id
                });

                return;
            }

            if (user == null) {
                if (emailAddressValid(userCollectionPermission.usernameOrEmailAddress) === true) {
                    const inviteUser = await context.connection
                        .getCustomRepository(UserRepository)
                        .createInviteUser(userCollectionPermission.usernameOrEmailAddress);

                    inviteUsers.push(inviteUser);
                    user = inviteUser;
                } else {
                    throw new ValidationError("USER_NOT_FOUND - " + userCollectionPermission.usernameOrEmailAddress);
                }
            } else {
                if (user.status === UserStatus.PENDING_SIGN_UP) {
                    inviteUsers.push(user);
                } else {
                    existingUsers.push(user);
                }
            }

            await transaction.getCustomRepository(UserCollectionPermissionRepository).setUserCollectionPermissions({
                identifier,
                value: userCollectionPermission
            });

            await createActivityLog(transaction, {
                userId: context.me.id,
                eventType: ActivityLogEventType.COLLECTION_USER_PERMISSION_ADDED_UPDATED,
                targetCollectionId: collectionEntity.id,
                targetUserId: user.id,
                permissions: userCollectionPermission.permissions
            });
        });
    });

    await asyncForEach(existingUsers, async (user) => {
        await sendShareNotification(
            user,
            context.me.displayName,
            collectionEntity.name,
            "/collection/" + collectionEntity.collectionSlug,
            message
        );
    });
    await asyncForEach(inviteUsers, async (user) => {
        await sendInviteUser(user, context.me.displayName, collectionEntity.name, message);
    });
};

export const deleteUserCollectionPermissions = async (
    _0: unknown,
    { identifier, usernameOrEmailAddress }: { identifier: CollectionIdentifierInput; usernameOrEmailAddress: string },
    context: AuthenticatedContext
): Promise<void> => {
    return context.connection.transaction(async (transaction) => {
        const user = await transaction
            .getCustomRepository(UserRepository)
            .getUserByUsernameOrEmailAddress(usernameOrEmailAddress);
        if (!user) {
            throw new Error("USER_NOT_FOUND-" + usernameOrEmailAddress);
        }

        const collectionEntity = await getCollectionFromCacheOrDbOrFail(
            context,
            transaction,
            identifier.collectionSlug
        );
        if (!collectionEntity.isPublic) {
            await deleteCollectionFollowByUserId(transaction, collectionEntity.id, user.id);
        }

        return transaction
            .getCustomRepository(UserCollectionPermissionRepository)
            .deleteUserCollectionPermissionsForUser({
                identifier,
                user
            });
    });
};

export const getCollectionPermissionsFromCacheOrDb = async (
    context: Context,
    collection: CollectionEntity
): Promise<Permission[]> => {
    if (!isAuthenticatedContext(context)) {
        if (collection.isPublic) return [Permission.VIEW];
        else return [];
    }

    const userId = (context as AuthenticatedContext).me.id;

    const collectionPromiseFunction = async () => {
        const userPermissions = await context.connection
            .getCustomRepository(UserCollectionPermissionRepository)
            .findCollectionPermissions({ collectionId: collection.id, userId });

        const userGroupPermissions = await context.connection
            .getCustomRepository(GroupCollectionPermissionRepository)
            .getCollectionPermissionsByUser({
                collectionId: collection.id,
                userId
            });

        const permissions: Permission[] = [];

        if (userPermissions) {
            userPermissions.permissions.forEach((permission) => {
                if (!permissions.includes(permission)) permissions.push(permission);
            });
        }

        if (userGroupPermissions) {
            userGroupPermissions.forEach((groupPermission) => {
                groupPermission.permissions.forEach((permission) => {
                    if (!permissions.includes(permission)) permissions.push(permission);
                });
            });
        }

        return permissions;
    };

    return (await context.cache.loadCollectionPermissionsById(collection.id, collectionPromiseFunction)) || [];
};
