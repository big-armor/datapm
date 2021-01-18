import { EntityRepository, Repository, EntityManager, SelectQueryBuilder, Like } from "typeorm";

import { UserEntity } from "../entity/UserEntity";
import { UpdateCatalogInput, CreateCatalogInput, Permission, CatalogIdentifierInput } from "../generated/graphql";
import { CatalogEntity } from "../entity/CatalogEntity";
import { PackageEntity } from "../entity/PackageEntity";
import { grantUserCatalogPermission } from "./CatalogPermissionRepository";
import { PackageRepository } from "./PackageRepository";
import { ImageStorageService } from "../storage/images/image-storage-service";
import { StorageErrors } from "../storage/files/file-storage-service";
import { UserRepository } from "./UserRepository";
import { View } from "typeorm/schema-builder/view/View";

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
}): Promise<CatalogEntity> {
    const ALIAS = "catalogentity";

    let query = manager
        .getRepository(CatalogEntity)
        .createQueryBuilder(ALIAS)
        .where({ slug: slug })
        .addRelations(ALIAS, relations);

    const catalog = await query.getOne();
    if (!catalog) throw new Error(`Failed to get catalog ${slug}`);
    return catalog;
}

@EntityRepository(CatalogEntity)
export class CatalogRepository extends Repository<CatalogEntity> {
    /** Use this function to create a user scoped query that returns only catalogs that should be visible to that user */
    createQueryBuilderWithUserConditions(user: UserEntity | null, permission: Permission) {
        if (user == null) {
            return this.manager
                .getRepository(CatalogEntity)
                .createQueryBuilder()
                .where(`("CatalogEntity"."isPublic" is true)`);
        } else {
            return this.manager.getRepository(CatalogEntity).createQueryBuilder().where(
                `
                (
                    "CatalogEntity"."isPublic" is true 
                    or 
                    ("CatalogEntity"."isPublic" is false and "CatalogEntity"."id" in (select uc.catalog_id from user_catalog uc where uc.user_id = :userId and :permission = ANY(uc.permission)))
                )`,
                { userId: user.id, permission }
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
        return this.manager.getRepository(CatalogEntity).findOne({ where: { slug: slug }, relations: relations });
    }

    async findCatalogBySlugOrFail(slug: string, relations?: string[]): Promise<CatalogEntity> {
        const catalog = await this.manager
            .getRepository(CatalogEntity)
            .findOne({ where: { slug: slug }, relations: relations });

        if (catalog == null) {
            throw new Error(`CATALOG_NOT_FOUND ${slug}`);
        }

        return catalog;
    }

    createCatalog({
        userId,
        value,
        relations = []
    }: {
        userId: number;
        value: CreateCatalogInput;
        relations?: string[];
    }): Promise<CatalogEntity> {
        return this.manager.nestedTransaction(async (transaction) => {
            if (value.slug.trim() === "") {
                throw new Error("CATALOG_SLUG_REQUIRED");
            }

            const existingCatalogs = await transaction.find(CatalogEntity, {
                where: {
                    slug: value.slug
                }
            });

            if (existingCatalogs.length > 0) {
                throw new Error(`CATALOG_SLUG_NOT_AVAILABLE ${value.slug}`);
            }

            const now = new Date();
            const catalog = transaction.create(CatalogEntity);
            catalog.slug = value.slug;
            catalog.displayName = value.displayName;
            catalog.description = value.description || null;
            catalog.isPublic = value.isPublic;
            catalog.createdAt = now;
            catalog.website = value.website ? value.website : "";
            catalog.updatedAt = now;
            catalog.creatorId = userId;

            const savedCatalog = await transaction.save(catalog);

            await grantUserCatalogPermission({
                userId,
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
    }): Promise<CatalogEntity> {
        return this.manager.nestedTransaction(async (transaction) => {
            const catalog = await transaction.getRepository(CatalogEntity).findOneOrFail({
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
                        await transaction.save(packageEntity);
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
    ): Promise<PackageEntity[]> {
        const ALIAS = "package";
        const packages = await this.manager
            .getRepository(PackageEntity)
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
        const catalog = await this.manager.getRepository(CatalogEntity).findOneOrFail({
            where: { slug: slug }
        });

        // find all packages that are part of this catalog
        const ALIAS = "package";
        const packages = await this.manager
            .getRepository(PackageEntity)
            .createQueryBuilder(ALIAS)
            .where({ catalogId: catalog.id })
            .addRelations(ALIAS, ["catalog"])
            .getMany();

        await this.manager.getCustomRepository(PackageRepository).deletePackages({ packages: packages });

        await this.manager.nestedTransaction(async (transaction) => {
            await transaction.delete(CatalogEntity, { id: catalog.id });
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
        user: UserEntity | undefined;
        startsWith: string;
        relations?: string[];
    }): Promise<CatalogEntity[]> {
        const ALIAS = "autoCompleteCatalog";

        const entities = await this.createQueryBuilderWithUserConditions(user || null, Permission.VIEW)
            .andWhere(
                `(LOWER("CatalogEntity"."slug") LIKE :valueLike OR LOWER("CatalogEntity"."displayName") LIKE :valueLike)`,
                {
                    startsWith,
                    valueLike: startsWith.toLowerCase() + "%"
                }
            )
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
        user: UserEntity;
        username: string;
        offSet: number;
        limit: number;
        relations?: string[];
    }): Promise<[CatalogEntity[], number]> {
        const targetUser = await this.manager.getCustomRepository(UserRepository).findUserByUserName({ username });
        const response = await this.createQueryBuilderWithUserConditions(user, Permission.VIEW)
            .andWhere(`("CatalogEntity"."creator_id" = :targetUserId)`)
            .setParameter("targetUserId", targetUser.id)
            .offset(offSet)
            .limit(limit)
            .addRelations("CatalogEntity", relations)
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
        user: UserEntity;
        query: string;
        limit: number;
        offSet: number;
        relations?: string[];
    }): Promise<[CatalogEntity[], number]> {
        const ALIAS = "search";

        const count = this.createQueryBuilderWithUserConditions(user, Permission.VIEW)
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
