import { EntityRepository, Repository, EntityManager } from "typeorm";

import { User } from "../entity/User";
import { Permission, CatalogIdentifierInput, SetUserCatalogPermissionInput } from "../generated/graphql";
import { Catalog } from "../entity/Catalog";
import { UserCatalogPermission } from "../entity/UserCatalogPermission";
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
}): Promise<UserCatalogPermission> {
    const ALIAS = "catalog";

    let query = manager
        .getRepository(UserCatalogPermission)
        .createQueryBuilder(ALIAS)
        .where({ userId: userId, catalogId: catalogId, permission: permission })
        .addRelations(ALIAS, relations);

    const catalog = await query.getOne();
    if (!catalog) throw new Error(`Failed to get catalog user permission ${catalogId},${userId},${permission}`);
    return catalog;
}

export async function grantUserCatalogPermission({
    username,
    catalogSlug,
    permissions,
    manager,
    relations = []
}: {
    username: string;
    catalogSlug: string;
    permissions: Permission[];
    manager: EntityManager;
    relations?: string[];
}): Promise<UserCatalogPermission | null> {
    const userCatalogPermission = await manager.nestedTransaction(async (transaction) => {
        // find the user
        const user = await transaction.getCustomRepository(UserRepository).findUserByUserName({ username });

        // find the catalog
        const catalog = await transaction
            .getCustomRepository(CatalogRepository)
            .findCatalogBySlug({ slug: catalogSlug });

        if (catalog == null) {
            throw new UserInputError("CATALOG_NOT_FOUND");
        }

        // Check that the user does not already have this permission.
        let returnValue = await getUserCatalogPermission({
            userId: user.id,
            catalogId: catalog.id,
            manager: transaction
        });

        if (returnValue) return returnValue;

        const entry = transaction.getRepository(UserCatalogPermission).create();
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
}): Promise<UserCatalogPermission | null> {
    const ALIAS = "catalog";

    let query = manager
        .getRepository(UserCatalogPermission)
        .createQueryBuilder(ALIAS)
        .where({ userId: userId, catalogId: catalogId })
        .addRelations(ALIAS, relations);

    const catalog = await query.getOne();
    return catalog || null;
}

@EntityRepository(UserCatalogPermission)
export class UserCatalogPermissionRepository extends Repository<UserCatalogPermission> {
    findCatalogPermissions({
        catalogId,
        userId,
        relations = []
    }: {
        catalogId: number;
        userId: number;
        relations?: string[];
    }) {
        const ALIAS = "userPackagePermission";
        return this.manager
            .getRepository(UserCatalogPermission)
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
    }): Promise<UserCatalogPermission[]> {
        const user = await this.manager.getRepository(User).findOneOrFail({ username: username });

        const ALIAS = "UserCatalogPermission";
        return this.manager
            .getRepository(UserCatalogPermission)
            .createQueryBuilder(ALIAS)
            .where({ userId: user.id })
            .addRelations(ALIAS, relations)
            .getMany();
    }

    async userHasPermission({
        username,
        catalogSlug,
        permission
    }: {
        username: string;
        catalogSlug: string;
        permission: Permission;
    }): Promise<boolean> {
        const catalog = await this.manager.getRepository(Catalog).findOneOrFail({
            slug: catalogSlug
        });

        const user = await this.manager.getRepository(User).findOneOrFail({
            username
        });

        const userCatalogPermission = await this.manager.getRepository(UserCatalogPermission).findOneOrFail({
            userId: user.id,
            catalogId: catalog.id
        });

        return userCatalogPermission.permissions.indexOf(permission) != -1;
    }

    public async findByUserAndCatalogId(userId: number, catalogId: number): Promise<UserCatalogPermission | undefined> {
        return this.createQueryBuilder().where({ userId: userId, catalogId: catalogId }).getOne();
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
        await this.manager.nestedTransaction(async (transaction) => {
            const user = await transaction.getCustomRepository(UserRepository).getUserByUsername(value.username);

            if (!user) {
                throw new Error(`User ${value.username} not found`);
            }
            const catalogEntity = await transaction
                .getCustomRepository(CatalogRepository)
                .findCatalogBySlugOrFail(identifier.catalogSlug);
            console.log(catalogEntity);
            debugger;
            const permissions = await this.findByUserAndCatalogId(user.id, catalogEntity.id);

            // If User does not exist in UserCatalogTable, it creates new record
            if (permissions == undefined) {
                try {
                    await transaction
                        .createQueryBuilder()
                        .insert()
                        .into(UserCatalogPermission)
                        .values({
                            catalogId: catalogEntity.id,
                            userId: user.id,
                            permissions: value.permission
                        })
                        .execute();
                } catch (e) {
                    console.log(e);
                }
            }

            // Updates permissions if user exists already in UserCatalogTable
            if (permissions != undefined && value.permission.length) {
                try {
                    await transaction
                        .createQueryBuilder()
                        .update(UserCatalogPermission)
                        .set({ permissions: value.permission })
                        .where({ catalogId: catalogEntity.id, userId: user.id })
                        .execute();
                } catch (e) {
                    console.log(e);
                }
            }
        });
    }

    public async myCatalogPermission(user: User, identifier: CatalogIdentifierInput): Promise<Permission[]> {
        // return this.createQueryBuilder().where({}).getOne();
        return await this.manager.nestedTransaction(async (transaction) => {
            const catalogEntity = await transaction
                .getCustomRepository(CatalogRepository)
                .findCatalogBySlugOrFail(identifier.catalogSlug);

            if (catalogEntity.slug == user.username) return [Permission.MANAGE, Permission.EDIT, Permission.VIEW];
            if (catalogEntity.isPublic) return [Permission.VIEW];
            throw new ForbiddenError("NOT_AUTHORIZED");
        });
    }
}
