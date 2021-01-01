import { EntityRepository, Repository, EntityManager, SelectQueryBuilder, Like } from "typeorm";

import { User } from "../entity/User";
import {
    UpdateCatalogInput,
    CreateCatalogInput,
    Permission,
    CatalogIdentifier,
    CatalogIdentifierInput,
    CatalogsResult
} from "../generated/graphql";
import { Catalog } from "../entity/Catalog";
import { Package } from "../entity/Package";
import { UserCatalogPermission } from "../entity/UserCatalogPermission";
import { Permissions } from "../entity/Permissions";
import { UserCatalogPermissionRepository, grantUserCatalogPermission } from "./CatalogPermissionRepository";
import { PackageRepository } from "./PackageRepository";
import { Identifier } from "../util/IdentifierUtil";
import { PackageFileStorageService } from "../storage/packages/package-file-storage-service";
import { ImageStorageService } from "../storage/images/image-storage-service";
import { StorageErrors } from "../storage/files/file-storage-service";
import { UserRepository } from "./UserRepository";

// https://stackoverflow.com/a/52097700
export function isDefined<T>(value: T | undefined | null): value is T {
    return <T>value !== undefined && <T>value !== null;
}

declare module "typeorm" {
    interface SelectQueryBuilder<Entity> {
        filterUserCatalog(topLevelAlias: string, catalogId: number): SelectQueryBuilder<Entity>;
    }
}

SelectQueryBuilder.prototype.filterUserCatalog = function (topLevelAlias: string, catalogId: number) {
    return this.innerJoin(`${topLevelAlias}.userCatalogs`, "uo", "uo.catalogId = :catalogId", {
        catalogId
    });
};

async function getCatalogOrFail({
    slug,
    manager,
    relations = []
}: {
    slug: string;
    manager: EntityManager;
    relations?: string[];
}): Promise<Catalog> {
    const ALIAS = "catalog";

    let query = manager
        .getRepository(Catalog)
        .createQueryBuilder(ALIAS)
        .where({ slug: slug })
        .addRelations(ALIAS, relations);

    const catalog = await query.getOne();
    if (!catalog) throw new Error(`Failed to get catalog ${slug}`);
    return catalog;
}

@EntityRepository(Catalog)
export class CatalogRepository extends Repository<Catalog> {
    /** Use this function to create a user scoped query that returns only catalogs that should be visible to that user */
    createQueryBuilderWithUserConditions(user: User | null) {
        if (user == null) {
            return this.manager.getRepository(Catalog).createQueryBuilder().where(`("Catalog"."isPublic" is true)`);
        } else {
            return this.manager.getRepository(Catalog).createQueryBuilder().where(
                `("Catalog"."isPublic" is true 
        or ("Catalog"."isPublic" is false and "Catalog"."id" in (select uc.catalog_id from user_catalog uc where uc.user_id = :userId)))`,
                { userId: user.id }
            );
        }
    }

    async findCatalog({ slug, relations = [] }: { slug: string; relations?: string[] }) {
        return getCatalogOrFail({
            slug: slug,
            manager: this.manager,
            relations
        });
    }

    async findCatalogBySlug({ slug, relations = [] }: { slug: string; relations?: string[] }) {
        return this.manager.getRepository(Catalog).findOne({ where: { slug: slug }, relations: relations });
    }

    async findCatalogBySlugOrFail(slug: string, relations?: string[]): Promise<Catalog> {
        const catalog = await this.manager
            .getRepository(Catalog)
            .findOne({ where: { slug: slug }, relations: relations });

        if (catalog == null) {
            throw new Error(`CATALOG_NOT_FOUND ${slug}`);
        }

        return catalog;
    }

    createCatalog({
        username,
        value,
        relations = []
    }: {
        username: string;
        value: CreateCatalogInput;
        relations?: string[];
    }): Promise<Catalog> {
        return this.manager.nestedTransaction(async (transaction) => {
            if (value.slug.trim() === "") {
                throw new Error("CATALOG_SLUG_REQUIRED");
            }

            const existingCatalogs = await transaction.find(Catalog, {
                where: {
                    slug: value.slug
                }
            });

            if (existingCatalogs.length > 0) {
                throw new Error(`CATALOG_SLUG_NOT_AVAILABLE ${value.slug}`);
            }

            const now = new Date();
            const catalog = transaction.create(Catalog);
            catalog.slug = value.slug;
            catalog.displayName = value.displayName;
            catalog.description = value.description || null;
            catalog.isPublic = value.isPublic;
            catalog.createdAt = now;
            catalog.website = value.website ? value.website : "";
            catalog.updatedAt = now;

            const savedCatalog = await transaction.save(catalog);

            await grantUserCatalogPermission({
                username,
                catalogSlug: value.slug,
                permissions: [Permission.MANAGE, Permission.EDIT, Permission.VIEW],
                manager: transaction
            });

            return getCatalogOrFail({
                slug: savedCatalog.slug,
                manager: transaction,
                relations
            });
        });
    }

    updateCatalog({
        identifier,
        value,
        relations = []
    }: {
        identifier: CatalogIdentifierInput;
        value: UpdateCatalogInput;
        relations?: string[];
    }): Promise<Catalog> {
        return this.manager.nestedTransaction(async (transaction) => {
            const catalog = await transaction.getRepository(Catalog).findOneOrFail({
                where: { slug: identifier.catalogSlug },
                relations: ["packages"]
            });

            if (value.newSlug) {
                catalog.slug = value.newSlug;
            }

            if (value.displayName) {
                catalog.displayName = value.displayName;
            }

            if (value.isPublic != null) {
                catalog.isPublic = value.isPublic;

                if (catalog.isPublic == false) {
                    for (const packageEntity of catalog.packages) {
                        packageEntity.isPublic = false;
                        transaction.save(packageEntity);
                    }
                }
            }

            if (value.description) {
                catalog.description = value.description;
            }

            if (value.website) {
                catalog.website = value.website;
            }

            await transaction.save(catalog);

            // return result with requested relations
            return getCatalogOrFail({
                slug: value.newSlug ? value.newSlug : identifier.catalogSlug,
                manager: transaction,
                relations
            });
        });
    }

    public async catalogPackages(
        catalogId: number,
        limit: number,
        offset: number,
        relations?: string[]
    ): Promise<Package[]> {
        const ALIAS = "package";
        const packages = await this.manager
            .getRepository(Package)
            .createQueryBuilder(ALIAS)
            .where({ catalogId: catalogId })
            .orderBy('"package"."updated_at"', "DESC")
            .addRelations(ALIAS, ["catalog"])
            .limit(limit)
            .offset(offset)
            .getMany();

        return packages;
    }

    async deleteCatalog({ slug }: { slug: string }): Promise<void> {
        const catalog = await this.manager.getRepository(Catalog).findOneOrFail({
            where: { slug: slug }
        });

        // find all packages that are part of this catalog
        const ALIAS = "package";
        const packages = await this.manager
            .getRepository(Package)
            .createQueryBuilder(ALIAS)
            .where({ catalogId: catalog.id })
            .addRelations(ALIAS, ["catalog"])
            .getMany();

        await this.manager.getCustomRepository(PackageRepository).deletePackages({ packages: packages });

        await this.manager.nestedTransaction(async (transaction) => {
            await transaction.delete(Catalog, { id: catalog.id });
        });

        try {
            await ImageStorageService.INSTANCE.deleteCatalogCoverImage(catalog.id);
        } catch (error) {
            if (error.message == StorageErrors.FILE_DOES_NOT_EXIST) return;

            console.error(error.message);
        }
    }

    async autocomplete({
        user,
        startsWith,
        relations = []
    }: {
        user: User | undefined;
        startsWith: string;
        relations?: string[];
    }): Promise<Catalog[]> {
        const ALIAS = "autoCompleteCatalog";

        const entities = await this.createQueryBuilderWithUserConditions(user || null)
            .andWhere(`(LOWER("Catalog"."slug") LIKE :valueLike OR LOWER("Catalog"."displayName") LIKE :valueLike)`, {
                startsWith,
                valueLike: startsWith.toLowerCase() + "%"
            })
            .addRelations(ALIAS, relations)
            .getMany();

        return entities;
    }

    async userCatalogs({
        user,
        username,
        offSet,
        limit,
        relations = []
    }: {
        user: User;
        username: string;
        offSet: number;
        limit: number;
        relations?: string[];
    }): Promise<[Catalog[], number]> {
        const targetUser = await this.manager.getCustomRepository(UserRepository).findUserByUserName({ username });
        const response = await this.createQueryBuilderWithUserConditions(user)
            .andWhere(
                `("Catalog"."id" IN (SELECT "catalog_id" FROM "user_catalog" uc WHERE "uc"."user_id" = :targetUserId AND 'MANAGE' = ANY( "uc"."permission") ))`
            )
            .setParameter("targetUserId", targetUser.id)
            .offset(offSet)
            .limit(limit)
            .addRelations("Catalog", relations)
            .getManyAndCount();

        return response;
    }

    async search({
        user,
        query,
        limit,
        offSet,
        relations = []
    }: {
        user: User;
        query: string;
        limit: number;
        offSet: number;
        relations?: string[];
    }): Promise<[Catalog[], number]> {
        const ALIAS = "search";

        const count = this.createQueryBuilderWithUserConditions(user)
            .andWhere(
                `(displayName_tokens @@ websearch_to_tsquery(:query) OR description_tokens @@ websearch_to_tsquery(:query) OR slug LIKE :queryLike))`,
                {
                    query,
                    queryLike: query + "%"
                }
            )
            .limit(limit)
            .offset(offSet)
            .addRelations(ALIAS, relations)
            .getManyAndCount();

        return count;
    }
}
