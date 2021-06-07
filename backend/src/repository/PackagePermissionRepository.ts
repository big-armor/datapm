import { EntityRepository, EntityManager, DeleteResult, Connection } from "typeorm";

import { UserPackagePermissionEntity } from "../entity/UserPackagePermissionEntity";
import { UserRepository } from "./UserRepository";
import { Permission, PackageIdentifier, PackageIdentifierInput } from "../generated/graphql";
import { PackageRepository } from "./PackageRepository";
import { PackageEntity } from "../entity/PackageEntity";
import { UserEntity } from "../entity/UserEntity";

async function getPackagePermissions({
    manager,
    packageId,
    userId,
    relations = []
}: {
    manager: EntityManager;
    packageId: number;
    userId: number;
    relations?: string[];
}): Promise<UserPackagePermissionEntity | undefined> {
    const ALIAS = "userPackagePermission";
    return manager
        .getRepository(UserPackagePermissionEntity)
        .createQueryBuilder(ALIAS)
        .addRelations(ALIAS, relations)
        .where({ packageId, userId })
        .getOne();
}

@EntityRepository()
export class PackagePermissionRepository {
    constructor(private manager: EntityManager) {}

    public async hasPermission(userId: number, packageId: number, permission: Permission): Promise<boolean> {
        const permissionsEntity = await this.findPackagePermissions({ packageId, userId });
        if (!permissionsEntity) {
            return false;
        }

        return permissionsEntity.permissions.some((p) => p === permission);
    }

    public findPackagePermissions({
        packageId,
        userId,
        relations = []
    }: {
        packageId: number;
        userId: number;
        relations?: string[];
    }): Promise<UserPackagePermissionEntity | undefined> {
        return getPackagePermissions({
            manager: this.manager,
            packageId,
            userId,
            relations
        });
    }

    public async usersByPackage(
        packageEntity: PackageEntity,
        relations?: string[]
    ): Promise<UserPackagePermissionEntity[]> {
        const ALIAS = "userPackagePermission";

        return await this.manager
            .getRepository(UserPackagePermissionEntity)
            .createQueryBuilder(ALIAS)
            .addRelations(ALIAS, relations)
            .where({ packageId: packageEntity.id })
            .getMany();
    }

    public async deleteUsersPermissionsByPackageId(packageId: number): Promise<DeleteResult> {
        return await this.manager
            .getRepository(UserPackagePermissionEntity)
            .createQueryBuilder("UserPackagePermissionEntity")
            .where('"package_id" = :packageId')
            .setParameter("packageId", packageId)
            .delete()
            .from(UserPackagePermissionEntity)
            .execute();
    }

    public async setPackagePermissions({
        identifier,
        userId,
        permissions,
        relations = []
    }: {
        identifier: PackageIdentifierInput;
        userId: number;
        permissions: Permission[];
        relations?: string[];
    }): Promise<void> {
        await this.manager.nestedTransaction(async (transaction) => {
            const user = await transaction.getRepository(UserEntity).findOneOrFail(userId);
            const packageEntity = await transaction
                .getCustomRepository(PackageRepository)
                .findPackageOrFail({ identifier });

            if (packageEntity.creatorId == user.id) {
                throw new Error("CANNOT_SET_PACKAGE_CREATOR_PERMISSIONS");
            }

            const packagePermissions = await this.findPackagePermissions({
                packageId: packageEntity.id,
                userId: user.id
            });

            // If user does not exist in collection permissions, it creates new record
            if (packagePermissions == undefined) {
                try {
                    return await this.storePackagePermissions(transaction, user.id, packageEntity.id, permissions);
                } catch (e) {
                    console.log(e);
                }
            }
            // If user does exists in package permissions, it updates the record found
            else {
                try {
                    return await transaction
                        .createQueryBuilder()
                        .update(UserPackagePermissionEntity)
                        .set({ permissions: permissions })
                        .where({ packageId: packageEntity.id, userId: user.id })
                        .execute();
                } catch (e) {
                    console.log(e);
                }
            }
            return;
        });
    }

    public async storePackagePermissions(
        transaction: EntityManager,
        userId: number,
        packageId: number,
        permissions: Permission[]
    ): Promise<UserPackagePermissionEntity> {
        const collectionPermissionEntry = transaction.create(UserPackagePermissionEntity);
        collectionPermissionEntry.userId = userId;
        collectionPermissionEntry.packageId = packageId;
        collectionPermissionEntry.permissions = permissions;
        return await transaction.save(collectionPermissionEntry);
    }

    public removePackagePermission({
        identifier,
        usernameOrEmailAddress
    }: {
        identifier: PackageIdentifierInput;
        usernameOrEmailAddress: string;
        relations?: string[];
    }): Promise<void> {
        return this.manager.nestedTransaction(async (transaction) => {
            const user = await transaction
                .getCustomRepository(UserRepository)
                .getUserByUsernameOrEmailAddress(usernameOrEmailAddress);
            if (!user) {
                throw new Error("USER_NOT_FOUND-" + usernameOrEmailAddress);
            }

            await this.removePackagePermissionForUser({ identifier, user });
        });
    }

    public removePackagePermissionForUser({
        identifier,
        user
    }: {
        identifier: PackageIdentifierInput;
        user: UserEntity;
        relations?: string[];
    }): Promise<void> {
        return this.manager.nestedTransaction(async (transaction) => {
            const packageEntity = await transaction
                .getCustomRepository(PackageRepository)
                .findPackageOrFail({ identifier });

            if (packageEntity.creatorId == user.id) {
                throw new Error("CANNOT_REMOVE_CREATOR_PERMISSIONS");
            }
            await transaction.delete(UserPackagePermissionEntity, { package: packageEntity, user });
        });
    }
}
