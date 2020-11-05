import { EntityRepository, Repository, EntityManager, SelectQueryBuilder, Like } from "typeorm";

import { User } from "../entity/User";
import {
    UpdateCatalogInput,
    CreateCatalogInput,
    Permission,
    CatalogIdentifier,
    CatalogIdentifierInput
} from "../generated/graphql";
import { deleteNoThrow } from "../util/deleteHelpers";
import { Catalog } from "../entity/Catalog";
import { Package } from "../entity/Package";
import { UserCatalogPermission } from "../entity/UserCatalogPermission";
import { Permissions } from "../entity/Permissions";
import { UserCatalogPermissionRepository, grantUserCatalogPermission } from "./CatalogPermissionRepository";
import { PackageRepository } from "./PackageRepository";
import { Identifier } from "../util/IdentifierUtil";

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
        .where({ slug: slug, isActive: true })
        .addRelations(ALIAS, relations);

    const catalog = await query.getOne();
    if (!catalog) throw new Error(`Failed to get catalog ${slug}`);
    return catalog;
}

@EntityRepository(Catalog)
export class CatalogRepository extends Repository<Catalog> {
    /** Use this function to create a user scoped query that returns only catalogs that should be visible to that user */
    createQueryBuilderWithUserConditions(user: User) {
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

    async findCatalog({ slug, relations = [] }: { slug: string; relations?: string[]; includeInactive?: boolean }) {
        return getCatalogOrFail({
            slug: slug,
            manager: this.manager,
            relations
        });
    }

    async findCatalogBySlug({
        slug,
        relations = []
    }: {
        slug: string;
        relations?: string[];
        includeInactive?: boolean;
    }) {
        return this.manager
            .getRepository(Catalog)
            .findOne({ where: { slug: slug, isActive: true }, relations: relations });
    }

    async findCatalogBySlugOrFail(slug: string, relations?: string[]): Promise<Catalog> {
        const catalog = this.manager
            .getRepository(Catalog)
            .findOne({ where: { slug: slug, isActive: true }, relations: relations });

        if (catalog != null) {
            throw new Error(`Catalog ${slug} could not be found`);
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
                throw new Error("Slug must not be empty or whitespace.");
            }

            const existingCatalogs = await transaction.find(Catalog, {
                where: {
                    slug: value.slug
                }
            });

            if (existingCatalogs.length > 0) {
                throw new Error(`Catalog "${value.slug}" already exists`);
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
            catalog.isActive = true;

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
                where: { slug: identifier.catalogSlug }
            });

            if (value.newSlug) {
                catalog.slug = value.newSlug;
            }

            if (value.displayName) {
                catalog.displayName = value.displayName;
            }

            if (value.isPublic != null) {
                catalog.isPublic = value.isPublic;
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

    async disableCatalog({ slug, relations = [] }: { slug: string; relations?: string[] }): Promise<Catalog> {
        const filesToDelete: string[] = [];

        const catalog_ = await this.manager.nestedTransaction(async (transaction) => {
            const catalog = await transaction.getRepository(Catalog).findOneOrFail({
                where: { slug: slug },
                relations
            });

            // find all packages that are part of this catalog
            const ALIAS = "package";
            const packages = await transaction
                .getRepository(Package)
                .createQueryBuilder(ALIAS)
                .where({ catalogId: catalog.id })
                .getMany();

            // set all packages false
            await transaction.getCustomRepository(PackageRepository).disablePackages({ packages: packages });

            catalog.isActive = false;
            catalog.slug = catalog.slug + "-DISABLED-" + new Date().getTime();

            await transaction.save(catalog);

            return catalog;
        });

        // IN FUTURE find filesToDelete

        // delete all files now that the transaction succeeded
        for (let file of filesToDelete) {
            if (file) {
                await deleteNoThrow(file);
            }
        }

        return catalog_;
    }

    async autocomplete({
        user,
        startsWith,
        relations = []
    }: {
        user: User;
        startsWith: string;
        relations?: string[];
    }): Promise<Catalog[]> {
        const ALIAS = "autoCompleteCatalog";

        const entities = this.createQueryBuilderWithUserConditions(user)
            .andWhere('(LOWER("Catalog"."displayName") LIKE \'' + startsWith.toLowerCase() + "%')")
            .addRelations(ALIAS, relations)
            .getMany();

        return entities;
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
            .andWhere(`(displayName_tokens @@ to_tsquery(:query) OR description_tokens @@ to_tsquery(:query))`, {
                query
            })
            .limit(limit)
            .offset(offSet)
            .addRelations(ALIAS, relations)
            .getManyAndCount();

        return count;
    }
}
