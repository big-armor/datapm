import { ValidationError } from "apollo-server";
import { emailAddressValid } from "datapm-lib";
import { AuthenticatedContext, Context } from "../context";
import { PackageEntity } from "../entity/PackageEntity";
import { UserEntity } from "../entity/UserEntity";
import { PackageIdentifierInput, Permission, SetPackagePermissionInput, UserStatus } from "../generated/graphql";
import { PackagePermissionRepository } from "../repository/PackagePermissionRepository";
import { PackageRepository } from "../repository/PackageRepository";
import { UserRepository } from "../repository/UserRepository";
import { asyncForEach } from "../util/AsyncForEach";
import { sendInviteUser, sendShareNotification, validateMessageContents } from "../util/smtpUtil";

export const hasPackagePermissions = async (context: Context, packageId: number, permission: Permission) => {
    if (permission == Permission.VIEW) {
        const packageEntity = await context.connection.getRepository(PackageEntity).findOneOrFail({ id: packageId });
        if (packageEntity?.isPublic) {
            return true;
        }
    }

    if (context.me == null) {
        return false;
    }

    return context.connection
        .getCustomRepository(PackagePermissionRepository)
        .hasPermission(context.me.id, packageId, permission);
};

export const hasPackageEntityPermissions = async (
    context: Context,
    packageEntity: PackageEntity,
    permission: Permission
) => {
    if (permission == Permission.VIEW) {
        if (packageEntity?.isPublic) {
            return true;
        }
    }

    if (context.me == null) {
        return false;
    }

    return context.connection
        .getCustomRepository(PackagePermissionRepository)
        .hasPermission(context.me.id, packageEntity.id, permission);
};

export const setPackagePermissions = async (
    _0: any,
    {
        identifier,
        value,
        message
    }: {
        identifier: PackageIdentifierInput;
        value: SetPackagePermissionInput[];
        message: string;
    },
    context: AuthenticatedContext,
    info: any
) => {
    validateMessageContents(message);

    const packageEntity = await context.connection
        .getCustomRepository(PackageRepository)
        .findPackage({ identifier, relations: ["catalog"] });

    if (packageEntity == null) {
        throw new Error("PACKAGE_NOT_FOUND - " + identifier.catalogSlug + "/" + identifier.packageSlug);
    }

    const inviteUsers: UserEntity[] = [];
    const existingUsers: UserEntity[] = [];

    await context.connection.transaction(async (transaction) => {
        await asyncForEach(value, async (userPackagePermission) => {
            let user = await transaction
                .getCustomRepository(UserRepository)
                .getUserByUsernameOrEmailAddress(userPackagePermission.usernameOrEmailAddress);

            const packagePermissionRepository = transaction.getCustomRepository(PackagePermissionRepository);
            if (userPackagePermission.permissions.length === 0) {
                if (!user) {
                    return;
                }

                return await packagePermissionRepository.removePackagePermissionForUser({
                    identifier,
                    user
                });
            }

            if (user == null) {
                if (emailAddressValid(userPackagePermission.usernameOrEmailAddress) === true) {
                    const inviteUser = await context.connection
                        .getCustomRepository(UserRepository)
                        .createInviteUser(userPackagePermission.usernameOrEmailAddress);

                    user = inviteUser;
                    inviteUsers.push(inviteUser);
                } else {
                    throw new ValidationError("USER_NOT_FOUND - " + userPackagePermission.usernameOrEmailAddress);
                }
            } else {
                if (user.status == UserStatus.PENDING_SIGN_UP) {
                    inviteUsers.push(user);
                } else {
                    existingUsers.push(user);
                }
            }

            await packagePermissionRepository.setPackagePermissions({
                identifier,
                userId: user.id,
                permissions: userPackagePermission.permissions
            });
        });
    });

    await asyncForEach(existingUsers, async (user) => {
        await sendShareNotification(
            user,
            context.me.displayName,
            packageEntity.displayName,
            "/" + packageEntity.catalog.slug + "/" + packageEntity.slug,
            message
        );
    });

    await asyncForEach(inviteUsers, async (user) => {
        await sendInviteUser(user, context.me.displayName, packageEntity.displayName, message);
    });
};

export const removePackagePermissions = async (
    _0: any,
    { identifier, usernameOrEmailAddress }: { identifier: PackageIdentifierInput; usernameOrEmailAddress: string },
    context: AuthenticatedContext
) => {
    return context.connection.getCustomRepository(PackagePermissionRepository).removePackagePermission({
        identifier,
        usernameOrEmailAddress
    });
};
