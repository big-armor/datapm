import { EntityRepository, Repository, EntityManager } from "typeorm";

import { UserEntity } from "../entity/UserEntity";
import {
    Permission,
    CatalogIdentifierInput,
    SetUserCatalogPermissionInput,
    UserCatalogPermissions
} from "../generated/graphql";
import { CatalogEntity } from "../entity/CatalogEntity";
import { UserCatalogPermissionEntity } from "../entity/UserCatalogPermissionEntity";
import { UserRepository } from "./UserRepository";
import { CatalogRepository } from "./CatalogRepository";
import { UserInputError, ForbiddenError } from "apollo-server";

async function getUserCatalogPermissionOrFail({
    userId,
    catalogId,
    permission,
    manager,
    relations = []
}: {
    userId: number;
    catalogId: number;
    permission: Permission;
    manager: EntityManager;
    relations?: string[];
}): Promise<UserCatalogPermissionEntity> {
    const ALIAS = "catalog";

    const query = manager
        .getRepository(UserCatalogPermissionEntity)
        .createQueryBuilder(ALIAS)
        .where({ userId: userId, catalogId: catalogId, permission: permission })
        .addRelations(ALIAS, relations);

    const catalog = await query.getOne();
    if (!catalog) throw new Error(`Failed to get catalog user permission ${catalogId},${userId},${permission}`);
    return catalog;
}

export async function grantUserCatalogPermission({
    userId,
    catalogSlug,
    permissions,
    manager,
    relations = []
}: {
    userId: number;
    catalogSlug: string;
    permissions: Permission[];
    manager: EntityManager;
    relations?: string[];
}): Promise<UserCatalogPermissionEntity | null> {
    const userCatalogPermission = await manager.nestedTransaction(async (transaction) => {
        // find the user
        const user = await transaction.getCustomRepository(UserRepository).findOne({ id: userId });
        if (user == null) throw new Error("USER_NOT_FOUND: " + userId);

        // find the catalog
        const catalog = await transaction
            .getCustomRepository(CatalogRepository)
            .findCatalogBySlug({ slug: catalogSlug });

        if (catalog == null) {
            throw new UserInputError("CATALOG_NOT_FOUND: " + catalogSlug);
        }

        // Check that the user does not already have this permission.
        const returnValue = await getUserCatalogPermission({
            userId: user.id,
            catalogId: catalog.id,
            manager: transaction
        });

        if (returnValue) return returnValue;

        const entry = transaction.getRepository(UserCatalogPermissionEntity).create();
        entry.userId = user.id;
        entry.catalogId = catalog.id;
        entry.permissions = permissions;
        entry.createdAt = new Date();
        entry.updatedAt = new Date();

        const savedEntry = await transaction.save(entry).catch((error) => {
            console.log(`error saving UserCatalogPermission ${error}`);
        });

        return savedEntry;
    });

    return userCatalogPermission || null;
}

// https://stackoverflow.com/a/52097700
export function isDefined<T>(value: T | undefined | null): value is T {
    return <T>value !== undefined && <T>value !== null;
}

async function getUserCatalogPermission({
    userId,
    catalogId,
    manager,
    relations = []
}: {
    userId: number;
    catalogId: number;
    manager: EntityManager;
    relations?: string[];
}): Promise<UserCatalogPermissionEntity | null> {
    const ALIAS = "catalog";

    const query = manager
        .getRepository(UserCatalogPermissionEntity)
        .createQueryBuilder(ALIAS)
        .where({ userId: userId, catalogId: catalogId })
        .addRelations(ALIAS, relations);

    const catalog = await query.getOne();
    return catalog || null;
}

export async function getAllCatalogPermissions(
    manager: EntityManager,
    catalogId: number,
    relations?: string[]
): Promise<UserCatalogPermissionEntity[]> {
    const ALIAS = "userCatalogPermission";
    return manager
        .getRepository(UserCatalogPermissionEntity)
        .createQueryBuilder(ALIAS)
        .addRelations(ALIAS, relations)
        .where({ catalogId })
        .getMany();
}

@EntityRepository(UserCatalogPermissionEntity)
export class UserCatalogPermissionRepository extends Repository<UserCatalogPermissionEntity> {
    public async hasPermission(userId: number, catalogId: number, permission: Permission): Promise<boolean> {
        const permissionsEntity = await this.findCatalogPermissions({ catalogId, userId });
        if (!permissionsEntity) {
            return false;
        }

        return permissionsEntity.permissions.some((p) => p === permission);
    }

    findCatalogPermissions({
        catalogId,
        userId,
        relations = []
    }: {
        catalogId: number;
        userId: number;
        relations?: string[];
    }): Promise<UserCatalogPermissionEntity | undefined> {
        const ALIAS = "userCatalogPermissions";
        return this.manager
            .getRepository(UserCatalogPermissionEntity)
            .createQueryBuilder(ALIAS)
            .addRelations(ALIAS, relations)
            .where({ catalogId, userId })
            .getOne();
    }

    async findByUser({
        username,
        relations = []
    }: {
        username: string;
        relations?: string[];
    }): Promise<UserCatalogPermissionEntity[]> {
        const user = await this.manager.getRepository(UserEntity).findOneOrFail({ username: username });

        const ALIAS = "UserCatalogPermission";
        return this.manager
            .getRepository(UserCatalogPermissionEntity)
            .createQueryBuilder(ALIAS)
            .where({ userId: user.id })
            .addRelations(ALIAS, relations)
            .getMany();
    }

    public async findByUserAndCatalogId(
        userId: number,
        catalogId: number
    ): Promise<UserCatalogPermissionEntity | undefined> {
        return this.createQueryBuilder().where({ userId: userId, catalogId: catalogId }).getOne();
    }

    public async usersByCatalog(catalogEntity: CatalogEntity, relations?: string[]): Promise<UserCatalogPermissions[]> {
        const ALIAS = "userCatalogPermission";

        return await this.manager
            .getRepository(UserCatalogPermissionEntity)
            .createQueryBuilder(ALIAS)
            .addRelations(ALIAS, relations)
            .where({ catalogId: catalogEntity.id })
            .getMany();
    }

    public async setUserCatalogPermission({
        identifier,
        value,
        relations
    }: {
        identifier: CatalogIdentifierInput;
        value: SetUserCatalogPermissionInput;
        relations?: string[];
    }): Promise<void> {
        await this.manager.nestedTransaction<void>(async (transaction) => {
            const user = await transaction
                .getCustomRepository(UserRepository)
                .getUserByUsernameOrEmailAddress(value.usernameOrEmailAddress);

            if (!user) {
                throw new Error(`USER_NOT_FOUND - ${value.usernameOrEmailAddress}`);
            }

            const catalogEntity = await transaction
                .getCustomRepository(CatalogRepository)
                .findCatalogBySlugOrFail(identifier.catalogSlug);

            if (catalogEntity.creatorId === user.id) {
                throw new Error("CANNOT_CHANGE_CATALOG_CREATOR_PERMISSIONS");
            }

            const permissions = await this.findByUserAndCatalogId(user.id, catalogEntity.id);

            // If permission input is not empty
            if (value.permission.length > 0) {
                // If user does not exist in catalog permissions, it creates new record
                if (permissions === undefined) {
                    try {
                        const catalogPermissionEntry = transaction.create(UserCatalogPermissionEntity);
                        catalogPermissionEntry.userId = user.id;
                        catalogPermissionEntry.catalogId = catalogEntity.id;
                        catalogPermissionEntry.permissions = value.permission;
                        catalogPermissionEntry.packagePermissions = value.packagePermissions;
                        await transaction.save(catalogPermissionEntry);
                    } catch (e) {
                        console.log(e);
                    }
                }

                // If user does exists in catalog permissions, it updates the record found
                else {
                    try {
                        await transaction
                            .createQueryBuilder()
                            .update(UserCatalogPermissionEntity)
                            .set({ permissions: value.permission, packagePermissions: value.packagePermissions })
                            .where({ catalogId: catalogEntity.id, userId: user.id })
                            .execute();
                    } catch (e) {
                        console.log(e);
                    }
                }
            }
            // If the permissions input is empty, it will delete the row in catalog permissions
            else {
                // If the permissions row exists in the table delete it
                if (permissions != null) {
                    try {
                        await transaction
                            .createQueryBuilder()
                            .delete()
                            .from(UserCatalogPermissionEntity)
                            .where({ catalogId: catalogEntity.id, userId: user.id })
                            .execute();
                    } catch (e) {
                        console.log(e);
                    }
                }
            }
        });
    }

    public deleteUserCatalogPermissionsForUser({
        identifier,
        user
    }: {
        identifier: CatalogIdentifierInput;
        user: UserEntity;
        relations?: string[];
    }): Promise<void> {
        return this.manager.nestedTransaction(async (transaction) => {
            const catalogEntity = await transaction
                .getCustomRepository(CatalogRepository)
                .findCatalogBySlugOrFail(identifier.catalogSlug);

            if (catalogEntity.creatorId === user.id) {
                throw new Error("CANNOT_REMOVE_CREATOR_PERMISSIONS");
            }

            await transaction.delete(UserCatalogPermissionEntity, { catalogId: catalogEntity.id, userId: user.id });
        });
    }
}
