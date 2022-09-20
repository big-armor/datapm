import { ValidationError } from "apollo-server";
import { UserCatalogPermissions } from "datapm-client-lib";
import { emailAddressValid } from "datapm-lib";
import { AuthenticatedContext, Context } from "../context";
import { UserEntity } from "../entity/UserEntity";
import {
    ActivityLogEventType,
    CatalogIdentifierInput,
    Permission,
    SetUserCatalogPermissionInput,
    UserStatus
} from "../generated/graphql";
import { createActivityLog } from "../repository/ActivityLogRepository";
import { UserCatalogPermissionRepository } from "../repository/CatalogPermissionRepository";
import { GroupCatalogPermissionRepository } from "../repository/GroupCatalogPermissionRepository";
import { UserRepository } from "../repository/UserRepository";
import { asyncForEach } from "../util/AsyncUtils";
import { sendInviteUser, sendShareNotification, validateMessageContents } from "../util/smtpUtil";
import { getCatalogFromCacheOrDbByIdOrFail, getCatalogFromCacheOrDbOrFail } from "./CatalogResolver";
import { deleteCatalogFollowByUserId } from "./FollowResolver";
import { deletePackageFollowsForUsersWithNoPermissions } from "./PackageResolver";
import { getUserFromCacheOrDbByIdOrFail } from "./UserResolver";

export const setUserCatalogPermission = async (
    _0: unknown,
    {
        identifier,
        value,
        message
    }: {
        identifier: CatalogIdentifierInput;
        value: SetUserCatalogPermissionInput[];
        message: string;
    },
    context: AuthenticatedContext
): Promise<void> => {
    validateMessageContents(message);

    const catalog = await getCatalogFromCacheOrDbOrFail(context, identifier, ["packages"]);
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

                if (!catalog.isPublic) {
                    await deleteCatalogFollowByUserId(transaction, catalog.id, user.id);
                    if (catalog.packages) {
                        const packageFollowRemovalPromises = catalog.packages.map((pkg) =>
                            deletePackageFollowsForUsersWithNoPermissions(pkg.id, transaction)
                        );
                        await Promise.all(packageFollowRemovalPromises);
                    }
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
                    user = inviteUser;
                } else {
                    throw new ValidationError("USER_NOT_FOUND - " + userCatalogPermission.usernameOrEmailAddress);
                }
            } else {
                if (user.status === UserStatus.PENDING_SIGN_UP) {
                    inviteUsers.push(user);
                } else {
                    existingUsers.push(user);
                }
            }

            await createActivityLog(transaction, {
                userId: context.me.id,
                eventType: ActivityLogEventType.CATALOG_USER_PERMISSION_ADDED_UPDATED,
                targetCatalogId: catalog.id,
                targetUserId: user.id,
                permissions: userCatalogPermission.permission
            });

            await transaction.getCustomRepository(UserCatalogPermissionRepository).setUserCatalogPermission({
                identifier,
                value: userCatalogPermission
            });
        });
    });

    await asyncForEach(existingUsers, async (user) => {
        await sendShareNotification(user, context.me.displayName, catalog.displayName, "/" + catalog.slug, message);
    });

    await asyncForEach(inviteUsers, async (user) => {
        await sendInviteUser(user, context.me.displayName, catalog.displayName, message);
    });
};

export const deleteUserCatalogPermissions = async (
    _0: unknown,
    { identifier, usernameOrEmailAddress }: { identifier: CatalogIdentifierInput; usernameOrEmailAddress: string },
    context: AuthenticatedContext
): Promise<void> => {
    return context.connection.transaction(async (transaction) => {
        const user = await transaction
            .getCustomRepository(UserRepository)
            .getUserByUsernameOrEmailAddress(usernameOrEmailAddress);
        if (!user) {
            throw new Error("USER_NOT_FOUND-" + usernameOrEmailAddress);
        }

        const catalogEntity = await getCatalogFromCacheOrDbOrFail(context, identifier, ["packages"], true);
        if (!catalogEntity.isPublic) {
            await deleteCatalogFollowByUserId(transaction, catalogEntity.id, user.id);
            const packageFollowRemovalPromises = catalogEntity.packages.map((pkg) =>
                deletePackageFollowsForUsersWithNoPermissions(pkg.id, transaction)
            );
            await Promise.all(packageFollowRemovalPromises);
        }

        await createActivityLog(transaction, {
            userId: context.me.id,
            eventType: ActivityLogEventType.CATALOG_USER_PERMISSION_REMOVED,
            targetCatalogId: catalogEntity.id,
            targetUserId: user.id
        });

        return transaction.getCustomRepository(UserCatalogPermissionRepository).deleteUserCatalogPermissionsForUser({
            identifier,
            user
        });
    });
};

/** The catalog specific permissions (not the packages in the catalog) */
export const getCatalogPermissionsFromCacheOrDb = async (
    context: Context,
    catalogId: number,
    userId: number
): Promise<Permission[]> => {
    const catalogPermissionsPromiseFunction = async () => {
        const userPermissions = await context.connection
            .getCustomRepository(UserCatalogPermissionRepository)
            .findCatalogPermissions({ catalogId, userId });

        const userGroupPermissions = await context.connection
            .getCustomRepository(GroupCatalogPermissionRepository)
            .getCatalogPermissionsByUser({
                catalogId,
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

        const catalog = await getCatalogFromCacheOrDbByIdOrFail(context, context.connection, catalogId);

        const user = await getUserFromCacheOrDbByIdOrFail(context, context.connection, userId);

        if (catalog.slug === user.username) {
            permissions.push(Permission.VIEW);
            permissions.push(Permission.EDIT);
            permissions.push(Permission.MANAGE);
        }

        return permissions;
    };

    return (await context.cache.loadCatalogPermissionsById(catalogId, catalogPermissionsPromiseFunction)) || [];
};

/** The permissions for all packages in the catalog (not the catalog itself) */
export const getCatalogPackagePermissionsFromCacheOrDb = async (
    context: Context,
    catalogId: number,
    userId: number
): Promise<Permission[]> => {
    const catalogPermissionsPromiseFunction = async () => {
        const userPermissions = await context.connection
            .getCustomRepository(UserCatalogPermissionRepository)
            .findCatalogPermissions({ catalogId, userId });

        const userGroupPermissions = await context.connection
            .getCustomRepository(GroupCatalogPermissionRepository)
            .getCatalogPermissionsByUser({
                catalogId,
                userId
            });

        const permissions: Permission[] = [];

        if (userPermissions) {
            userPermissions.packagePermissions.forEach((permission) => {
                if (!permissions.includes(permission)) permissions.push(permission);
            });
        }

        if (userGroupPermissions) {
            userGroupPermissions.forEach((groupPermission) => {
                groupPermission.packagePermissions.forEach((permission) => {
                    if (!permissions.includes(permission)) permissions.push(permission);
                });
            });
        }

        const catalog = await getCatalogFromCacheOrDbByIdOrFail(context, context.connection, catalogId);

        const user = await getUserFromCacheOrDbByIdOrFail(context, context.connection, userId);

        if (catalog.slug === user.username) {
            permissions.push(Permission.VIEW);
            permissions.push(Permission.EDIT);
            permissions.push(Permission.MANAGE);
        }

        return permissions;
    };

    return (await context.cache.loadCatalogPackagePermissionsById(catalogId, catalogPermissionsPromiseFunction)) || [];
};
