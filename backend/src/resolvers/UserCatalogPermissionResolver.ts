import { ValidationError } from "apollo-server";
import { emailAddressValid } from "datapm-lib";
import { AuthenticatedContext, Context } from "../context";
import { CatalogEntity } from "../entity/CatalogEntity";
import { UserCatalogPermissionEntity } from "../entity/UserCatalogPermissionEntity";
import { UserEntity } from "../entity/UserEntity";
import { CatalogIdentifierInput, Permission, SetUserCatalogPermissionInput, UserStatus } from "../generated/graphql";
import { UserCatalogPermissionRepository } from "../repository/CatalogPermissionRepository";
import { UserRepository } from "../repository/UserRepository";
import { asyncForEach } from "../util/AsyncForEach";
import { sendInviteUser, sendShareNotification, validateMessageContents } from "../util/smtpUtil";
import { getCatalogFromCacheOrDbOrFail } from "./CatalogResolver";

export const hasCatalogPermissions = async (context: Context, catalog: CatalogEntity, permission: Permission) => {
    if (permission == Permission.VIEW) {
        if (catalog?.isPublic || catalog?.unclaimed) {
            return true;
        }
    }

    if (context.me == null) {
        return false;
    }

    return await getCatalogPermissionsStatusFromCacheOrDb(context, catalog.id, permission);
};

export const setUserCatalogPermission = async (
    _0: any,
    {
        identifier,
        value,
        message
    }: {
        identifier: CatalogIdentifierInput;
        value: SetUserCatalogPermissionInput[];
        message: string;
    },
    context: AuthenticatedContext,
    info: any
) => {
    validateMessageContents(message);

    const catalog = await getCatalogFromCacheOrDbOrFail(context, identifier);
    const inviteUsers: UserEntity[] = [];
    const existingUsers: UserEntity[] = [];

    await context.connection.transaction(async (transaction) => {
        await asyncForEach(value, async (userCatalogPermission) => {
            let user = await transaction
                .getCustomRepository(UserRepository)
                .getUserByUsernameOrEmailAddress(userCatalogPermission.usernameOrEmailAddress);

            const catalogPermissionRepository = transaction.getCustomRepository(UserCatalogPermissionRepository);
            if (userCatalogPermission.permission.length === 0) {
                if (!user) {
                    return;
                }

                return await catalogPermissionRepository.deleteUserCatalogPermissionsForUser({
                    identifier,
                    user
                });
            }

            if (user == null) {
                if (emailAddressValid(userCatalogPermission.usernameOrEmailAddress) === true) {
                    const inviteUser = await context.connection
                        .getCustomRepository(UserRepository)
                        .createInviteUser(userCatalogPermission.usernameOrEmailAddress);

                    inviteUsers.push(inviteUser);
                } else {
                    throw new ValidationError("USER_NOT_FOUND - " + userCatalogPermission.usernameOrEmailAddress);
                }
            } else {
                if (user.status == UserStatus.PENDING_SIGN_UP) {
                    inviteUsers.push(user);
                } else {
                    existingUsers.push(user);
                }
            }

            await transaction.getCustomRepository(UserCatalogPermissionRepository).setUserCatalogPermission({
                identifier,
                value: userCatalogPermission
            });
        });
    });

    await asyncForEach(inviteUsers, async (user) => {
        await sendShareNotification(user, context.me.displayName, catalog.displayName, "/" + catalog.slug, message);
    });

    await asyncForEach(inviteUsers, async (user) => {
        await sendInviteUser(user, context.me.displayName, catalog.displayName, message);
    });
};

export const deleteUserCatalogPermissions = async (
    _0: any,
    { identifier, usernameOrEmailAddress }: { identifier: CatalogIdentifierInput; usernameOrEmailAddress: string },
    context: AuthenticatedContext
) => {
    return context.connection.getCustomRepository(UserCatalogPermissionRepository).deleteUserCatalogPermissions({
        identifier,
        usernameOrEmailAddress
    });
};

export const getCatalogPermissionsStatusFromCacheOrDb = async (
    context: Context,
    catalogId: number,
    permission: Permission
) => {
    if (!context.me) {
        return false;
    }

    const permissionsPromise = context.connection
        .getCustomRepository(UserCatalogPermissionRepository)
        .hasPermission(context.me.id, catalogId, permission);

    return await context.cache.loadCatalogPermissionsStatusById(catalogId, permission, permissionsPromise);
};

export const getCatalogPermissionsFromCacheOrDb = async (context: Context, catalogId: number, userId: number) => {
    const catalogPermissionsPromise = context.connection
        .getCustomRepository(UserCatalogPermissionRepository)
        .findCatalogPermissions({ catalogId, userId }) as Promise<UserCatalogPermissionEntity>;
    return context.cache.loadCatalogPermissionsById(catalogId, catalogPermissionsPromise);
};
