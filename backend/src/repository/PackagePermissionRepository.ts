import { EntityRepository, EntityManager } from "typeorm";

import { UserPackagePermissionEntity } from "../entity/UserPackagePermissionEntity";
import { UserRepository } from "./UserRepository";
import { Permission, PackageIdentifier, PackageIdentifierInput } from "../generated/graphql";
import { PackageRepository } from "./PackageRepository";
import { PackageEntity } from "../entity/PackageEntity";

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

    findPackagePermissions({
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

    async setPackagePermissions({
        identifier,
        username,
        permissions,
        relations = []
    }: {
        identifier: PackageIdentifierInput;
        username: string;
        permissions: Permission[];
        relations?: string[];
    }): Promise<void> {
        await this.manager.nestedTransaction(async (transaction) => {
            // ensure user exists and is part of team
            const user = await transaction.getCustomRepository(UserRepository).findUser({ username });
            if (!user) {
                throw new Error(`USER_NOT_FOUND - ${username}`);
            }

            const catalogSlug = identifier.catalogSlug;
            const packageSlug = identifier.packageSlug;

            // ensure user exists and is part of team
            const packageEntity = await transaction
                .getCustomRepository(PackageRepository)
                .findPackageOrFail({ identifier });

            if (packageEntity.creatorId == user.id) throw new Error(`CANNOT_SET_PACKAGE_CREATOR_PERMISSIONS`);

            const packagePermissions = await this.findPackagePermissions({
                packageId: packageEntity.id,
                userId: user.id
            });

            // If permission input is not empty
            if (permissions.length > 0) {
                // If user does not exist in collection permissions, it creates new record
                if (packagePermissions == undefined) {
                    try {
                        const collectionPermissionEntry = transaction.create(UserPackagePermissionEntity);
                        collectionPermissionEntry.userId = user.id;
                        collectionPermissionEntry.packageId = packageEntity.id;
                        collectionPermissionEntry.permissions = permissions;
                        return await transaction.save(collectionPermissionEntry);
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
            }
            // If the permissions input is empty, it will delete the row in package permissions
            else {
                // If the permissions row exists in the table delete it
                if (packagePermissions != undefined) {
                    try {
                        return await transaction
                            .createQueryBuilder()
                            .delete()
                            .from(UserPackagePermissionEntity)
                            .where({ packageId: packageEntity.id, userId: user.id })
                            .execute();
                    } catch (e) {
                        console.log(e);
                    }
                }
            }
            return;
        });
    }

    removePackagePermission({
        identifier,
        username
    }: {
        identifier: PackageIdentifierInput;
        username: string;
        relations?: string[];
    }): Promise<void> {
        return this.manager.nestedTransaction(async (transaction) => {
            const user = await transaction.getCustomRepository(UserRepository).findOneOrFail({ username });
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
