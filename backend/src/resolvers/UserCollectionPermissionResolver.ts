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

export const hasCollectionPermissions = async (
    context: Context,
    collection: CollectionEntity,
    permission: Permission
) => {
    if (permission == Permission.VIEW) {
        if (collection?.isPublic) return true;
    }

    if (!isAuthenticatedContext(context)) {
        return false;
    }

    return getCollectionPermissionsFromCacheOrDb(context, collection, permission);
};

export const grantAllCollectionPermissionsForUser = async (
    transaction: EntityManager,
    userId: number,
    collectionId: number
) => {
    return transaction
        .getCustomRepository(UserCollectionPermissionRepository)
        .grantAllPermissionsForUser(userId, collectionId);
};

export const setPermissionsForUser = async (
    context: AuthenticatedContext,
    collectionId: number,
    permissions: Permission[]
) => {
    return context.connection
        .getCustomRepository(UserCollectionPermissionRepository)
        .setPermissionsForUser(context.me.id, collectionId, permissions);
};

export const setUserCollectionPermissions = async (
    _0: any,
    {
        identifier,
        value,
        message
    }: { identifier: CollectionIdentifierInput; value: SetUserCollectionPermissionsInput[]; message: string },
    context: AuthenticatedContext,
    info: any
) => {
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
                return await collectionPermissionRepository.deleteUserCollectionPermissionsForUser({
                    identifier,
                    user
                });
            }

            if (user == null) {
                if (emailAddressValid(userCollectionPermission.usernameOrEmailAddress) === true) {
                    const inviteUser = await context.connection
                        .getCustomRepository(UserRepository)
                        .createInviteUser(userCollectionPermission.usernameOrEmailAddress);

                    inviteUsers.push(inviteUser);
                } else {
                    throw new ValidationError("USER_NOT_FOUND - " + userCollectionPermission.usernameOrEmailAddress);
                }
            } else {
                if (user.status == UserStatus.PENDING_SIGN_UP) {
                    inviteUsers.push(user);
                } else {
                    existingUsers.push(user);
                }
            }

            await transaction.getCustomRepository(UserCollectionPermissionRepository).setUserCollectionPermissions({
                identifier,
                value: userCollectionPermission
            });
        });
    });

    await asyncForEach(inviteUsers, async (user) => {
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
    _0: any,
    { identifier, usernameOrEmailAddress }: { identifier: CollectionIdentifierInput; usernameOrEmailAddress: string },
    context: AuthenticatedContext
) => {
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
    collection: CollectionEntity,
    permission: Permission
) => {
    if (!isAuthenticatedContext(context)) {
        return false;
    }

    const userId = (context as AuthenticatedContext).me.id;
    const collectionPromiseFunction = () =>
        context.connection
            .getCustomRepository(UserCollectionPermissionRepository)
            .hasPermission(userId, collection, permission);

    return await context.cache.loadCollectionPermissionsStatusById(
        collection.id,
        permission,
        collectionPromiseFunction
    );
};
