import { ValidationError } from "apollo-server";
import { emailAddressValid } from "datapm-lib";
import { AuthenticatedContext, Context } from "../context";
import { CatalogEntity } from "../entity/CatalogEntity";
import { UserCatalogPermissionEntity } from "../entity/UserCatalogPermissionEntity";
import { UserEntity } from "../entity/UserEntity";
import { CatalogIdentifierInput, Permission, SetUserCatalogPermissionInput, UserStatus } from "../generated/graphql";
import { UserCatalogPermissionRepository } from "../repository/CatalogPermissionRepository";
import { UserRepository } from "../repository/UserRepository";
import { asyncForEach } from "../util/AsyncUtils";
import { isAuthenticatedContext } from "../util/contextHelpers";
import { sendInviteUser, sendShareNotification, validateMessageContents } from "../util/smtpUtil";
import { getCatalogFromCacheOrDbOrFail } from "./CatalogResolver";
import { deleteCatalogFollowByUserId } from "./FollowResolver";
import { deletePackageFollowsForUsersWithNoPermissions } from "./PackageResolver";

export const hasCatalogPermissions = async (context: Context, catalog: CatalogEntity, permission: Permission) => {
    if (permission == Permission.VIEW) {
        if (catalog?.isPublic || catalog?.unclaimed) {
            return true;
        }
    }

    if (!isAuthenticatedContext(context)) {
        return false;
    }

    const authenicatedContext = context as AuthenticatedContext;


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

        return transaction.getCustomRepository(UserCatalogPermissionRepository).deleteUserCatalogPermissionsForUser({
            identifier,
            user
        });
    });
};

export const getCatalogPermissionsStatusFromCacheOrDb = async (
    context: Context,
    catalogId: number,
    permission: Permission
) => {
    if (!isAuthenticatedContext(context)) {
        return false;
    }

    const authenicatedContext = context as AuthenticatedContext;

    const userId = authenicatedContext.me.id;
    const permissionsPromiseFunction = () =>
        context.connection
            .getCustomRepository(UserCatalogPermissionRepository)
            .hasPermission(userId, catalogId, permission);

    return await context.cache.loadCatalogPermissionsStatusById(catalogId, permission, permissionsPromiseFunction);
};

export const getCatalogPermissionsFromCacheOrDb = async (context: Context, catalogId: number, userId: number) => {
    const catalogPermissionsPromiseFunction = () =>
        context.connection
            .getCustomRepository(UserCatalogPermissionRepository)
            .findCatalogPermissions({ catalogId, userId }) as Promise<UserCatalogPermissionEntity>;
    return context.cache.loadCatalogPermissionsById(catalogId, catalogPermissionsPromiseFunction);
};
