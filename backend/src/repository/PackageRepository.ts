import { EntityRepository, EntityManager, FindOneOptions, Repository, Brackets, SelectQueryBuilder } from "typeorm";

import { CreatePackageInput, UpdatePackageInput, PackageIdentifierInput, Permission } from "../generated/graphql";
import { AuthenticatedContext } from "../context";
import { PackageEntity } from "../entity/PackageEntity";

import { UserPackagePermissionEntity } from "../entity/UserPackagePermissionEntity";
import { CatalogEntity } from "../entity/CatalogEntity";
import { CatalogRepository } from "./CatalogRepository";
import { VersionRepository } from "./VersionRepository";
import { allPermissions } from "../util/PermissionsUtil";
import { UserEntity } from "../entity/UserEntity";
import { UserInputError } from "apollo-server";
import { ImageStorageService } from "../storage/images/image-storage-service";
import { UserRepository } from "./UserRepository";
import { getEnvVariable } from "../util/getEnvVariable";
import { validatePackageSlug } from "../directive/ValidPackageSlugDirective";
import { validateCatalogSlug } from "../directive/ValidCatalogSlugDirective";

const PUBLIC_PACKAGES_QUERY = '("PackageEntity"."isPublic" is true)';
const AUTHENTICATED_USER_PACKAGES_QUERY = `
    (
        ("PackageEntity"."isPublic" is false and "PackageEntity"."catalog_id" in (select uc.catalog_id from user_catalog uc where uc.user_id = :userId and :permission = ANY(uc.package_permissions))) 
        or 
        ("PackageEntity"."isPublic" is false and "PackageEntity".id in (select up.package_id from user_package_permission up where up.user_id = :userId and :permission = ANY(up.permission)))
        or
        ("PackageEntity"."isPublic" is false and "PackageEntity".id in (select gp.package_id from group_package_permissions gp WHERE :permission = ANY(gp.permissions) AND gp.group_id IN (select gu.group_id FROM group_user gu WHERE gu.user_id = :userId)))
        or
        ("PackageEntity"."isPublic" is false and "PackageEntity".catalog_id in (select gc.catalog_id from group_catalog_permissions gc WHERE :permission = ANY(gc.package_permissions) AND gc.group_id IN (select gu.group_id FROM group_user gu WHERE gu.user_id = :userId)))
    )`;
export const AUTHENTICATED_USER_OR_PUBLIC_PACKAGES_QUERY = `(${PUBLIC_PACKAGES_QUERY} or ${AUTHENTICATED_USER_PACKAGES_QUERY})`;

async function findPackageById(
    manager: EntityManager,
    packageId: number,
    relations: string[]
): Promise<PackageEntity | null> {
    const ALIAS = "PackageEntity";
    const packageEntity = await manager
        .getRepository(PackageEntity)
        .createQueryBuilder(ALIAS)
        .where({ id: packageId })
        .addRelations(ALIAS, relations)
        .getOne();

    return packageEntity || null;
}

async function findPackage(
    manager: EntityManager,
    catalogSlug: string,
    packageSlug: string,
    relations: string[]
): Promise<PackageEntity | null> {
    const ALIAS = "PackageEntity";

    const catalog = await manager.getCustomRepository(CatalogRepository).findCatalogBySlug({ slug: catalogSlug });

    if (catalog === undefined) {
        throw new Error("CATALOG_NOT_FOUND: " + catalogSlug);
    }
    const options: FindOneOptions<PackageEntity> = {
        where: { catalogId: catalog.id, slug: packageSlug },
        relations: relations
    };

    const packageEntity = await manager.getRepository(PackageEntity).findOne(options);

    return packageEntity || null;
}

function getNameLength(name: string | undefined | null) {
    return name ? name.trim().length : 0;
}

function validation(packageEntity: PackageEntity) {
    if (getNameLength(packageEntity.slug) === 0) throw new Error("PACKAGE_NAME_REQUIRED");

    if (getNameLength(packageEntity.displayName) === 0) throw new Error("PACKAGE_DISPLAY_NAME_REQUIRED");

    if (getNameLength(packageEntity.description) === 0) throw new Error("PACKAGE_DESCRIPTION_REQUIRED");
}

function validateIdentifier(packageIdentifier: PackageIdentifierInput) {
    if (getNameLength(packageIdentifier.catalogSlug) === 0)
        throw new Error("PACKAGE_CATALOG_NOT_VALID: must be provided");
    if (getNameLength(packageIdentifier.packageSlug) === 0)
        throw new Error("PACKAGE_SLUG__NOT_VALID: must be provided");
}

@EntityRepository(PackageEntity)
export class PackageRepository extends Repository<PackageEntity> {
    async userPackages({
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
    }): Promise<[PackageEntity[], number]> {
        const targetUser = await this.manager.getCustomRepository(UserRepository).findUserByUserName({ username });

        if (targetUser == null) {
            throw new UserInputError("USER_NOT_FOUND " + username);
        }

        const modifiedRelations = [...(relations || [])];

        if (!relations?.includes("catalog")) {
            modifiedRelations.push("catalog");
        }

        const response = await this.createQueryBuilderWithUserConditions(user, Permission.VIEW)
            .andWhere(`("PackageEntity"."creator_id" = :targetUserId AND "PackageEntitycatalog"."unclaimed" = false)`)
            .setParameter("targetUserId", targetUser.id)
            .offset(offSet)
            .limit(limit)
            .addRelations("PackageEntity", modifiedRelations)
            .getManyAndCount();

        return response;
    }

    public async findPackagesForCollection(
        userId: number,
        collectionId: number,
        relations?: string[]
    ): Promise<PackageEntity[]> {
        return this.manager
            .getRepository(PackageEntity)
            .createQueryBuilder()
            .where(
                '("PackageEntity"."id" IN (SELECT package_id FROM collection_package WHERE collection_id = :collectionId))',
                { collectionId: collectionId }
            )
            .andWhere(AUTHENTICATED_USER_OR_PUBLIC_PACKAGES_QUERY, { userId: userId, permission: Permission.VIEW })
            .addRelations("PackageEntity", relations)
            .getMany();
    }

    /** Use this function to create a user scoped query that returns only packages that should be visible to that user */
    public createQueryBuilderWithUserConditions(
        user: UserEntity | undefined,
        permission: Permission = Permission.VIEW
    ): SelectQueryBuilder<PackageEntity> {
        if (user != null) {
            return this.createQueryBuilderWithUserConditionsByUserId(user.id, permission);
        }

        return this.manager.getRepository(PackageEntity).createQueryBuilder().where(PUBLIC_PACKAGES_QUERY);
    }

    public createQueryBuilderWithUserConditionsByUserId(
        userId: number,
        permission: Permission
    ): SelectQueryBuilder<PackageEntity> {
        return this.manager
            .getRepository(PackageEntity)
            .createQueryBuilder()
            .where(AUTHENTICATED_USER_OR_PUBLIC_PACKAGES_QUERY, { userId: userId, permission: permission });
    }

    async findOrFail({
        identifier,
        relations = []
    }: {
        identifier: PackageIdentifierInput;
        relations?: string[];
    }): Promise<PackageEntity> {
        validateIdentifier(identifier);

        const catalog = await this.manager.getRepository(CatalogEntity).findOneOrFail({ slug: identifier.catalogSlug });

        const packageEntity = await this.manager
            .getRepository(PackageEntity)
            .findOneOrFail({ where: { catalogId: catalog.id, slug: identifier.packageSlug }, relations });

        return packageEntity;
    }

    async catalogPackagesForUser({
        catalogId,
        user,
        relations = []
    }: {
        catalogId: number;
        user?: UserEntity;
        relations?: string[];
    }): Promise<PackageEntity[]> {
        const ALIAS = "PackageEntity";

        const packages = await this.createQueryBuilderWithUserConditions(user)
            .andWhere(`"PackageEntity"."catalog_id" = :catalogId `, { catalogId: catalogId })
            .addRelations(ALIAS, relations)
            .getMany();

        return packages;
    }

    async findPackageByIdOrFail({
        packageId,
        relations = []
    }: {
        packageId: number;
        relations?: string[];
    }): Promise<PackageEntity> {
        const packageEntity = await findPackageById(this.manager, packageId, relations);

        if (packageEntity == null) throw new Error("PACKAGE_NOT_FOUND");

        return packageEntity;
    }

    async findPackage({
        identifier,
        relations = []
    }: {
        identifier: PackageIdentifierInput;
        relations?: string[];
    }): Promise<PackageEntity | null> {
        validateIdentifier(identifier);

        const packageEntity = await findPackage(
            this.manager,
            identifier.catalogSlug,
            identifier.packageSlug,
            relations
        );

        return packageEntity;
    }

    async findPackageOrFail({
        identifier,
        relations = []
    }: {
        identifier: PackageIdentifierInput;
        relations?: string[];
    }): Promise<PackageEntity> {
        validateIdentifier(identifier);

        const packageEntity = await this.findPackage({ identifier, relations });

        if (packageEntity == null)
            throw new Error("PACKAGE_NOT_FOUND - " + identifier.catalogSlug + "/" + identifier.packageSlug);

        return packageEntity;
    }

    findPackages({ catalogId }: { catalogId: number }): Promise<PackageEntity[]> {
        const PRODUCTS_ALIAS = "packages";
        const query = this.manager
            .getRepository(PackageEntity)
            .createQueryBuilder(PRODUCTS_ALIAS)
            .where({ catalogId: catalogId });

        return query.getMany();
    }

    findPackageById({
        packageId,
        relations = []
    }: {
        packageId: number;
        relations?: string[];
    }): Promise<PackageEntity | null> {
        return findPackageById(this.manager, packageId, relations);
    }

    createPackage({
        userId,
        packageInput,
        relations = []
    }: {
        userId: number;
        packageInput: CreatePackageInput;
        relations?: string[];
    }): Promise<PackageEntity> {
        return this.manager.nestedTransaction(async (transaction) => {
            const catalog = await transaction
                .getCustomRepository(CatalogRepository)
                .findCatalogBySlug({ slug: packageInput.catalogSlug });

            if (catalog === undefined) {
                throw new Error("CATALOG_NOT_FOUND: " + packageInput.catalogSlug);
            }

            const packageEntity = transaction.getRepository(PackageEntity).create();

            packageEntity.catalogId = catalog.id;
            packageEntity.displayName = packageInput.displayName;
            packageEntity.slug = packageInput.packageSlug;
            packageEntity.description = packageInput.description || null;
            packageEntity.createdAt = new Date();
            packageEntity.updatedAt = new Date();
            packageEntity.creatorId = userId;

            return await this.createPackageEntity(transaction, userId, packageEntity, relations);
        });
    }

    async createPackageEntity(
        connection: EntityManager,
        userId: number,
        packageEntity: PackageEntity,
        relations: string[] = []
    ): Promise<PackageEntity> {
        validation(packageEntity);

        const insertedPackage = await connection.save(packageEntity);

        // add user as package manager of new package
        await connection.getRepository(UserPackagePermissionEntity).insert({
            packageId: insertedPackage.id,
            userId,
            permissions: allPermissions(),
            createdAt: new Date()
        });

        // requery resulting inserted person for graphql query result
        // needed to add proper joins
        const queryPackage = await findPackageById(connection, insertedPackage.id, relations);
        if (!queryPackage) {
            throw new Error("Unable to retrieve newly created package - this should never happen");
        }

        return queryPackage;
    }

    updatePackage({
        catalogSlug,
        packageSlug,
        packageInput,
        relations = []
    }: {
        catalogSlug: string;
        packageSlug: string;
        packageInput: UpdatePackageInput;
        relations?: string[];
    }): Promise<[PackageEntity, string[]]> {
        const propertiesEdited: string[] = [];

        return this.manager.nestedTransaction(async (transaction) => {
            const ALIAS = "packageentity";

            if (!relations.includes("catalog")) {
                relations.push("catalog");
            }

            if (!relations.includes("versions")) {
                relations.push("versions");
            }

            const packageEntity = await findPackage(transaction, catalogSlug, packageSlug, relations);

            if (packageEntity == null) {
                throw new Error("PACKAGE_NOT_FOUND");
            }

            if (packageInput.newCatalogSlug && packageInput.newCatalogSlug !== packageEntity.catalog.slug) {
                packageEntity.catalogId = (
                    await transaction
                        .getCustomRepository(CatalogRepository)
                        .findOneOrFail({ slug: packageInput.newCatalogSlug })
                ).id;
                propertiesEdited.push("catalogSlug");
            }

            if (packageInput.newPackageSlug && packageInput.newPackageSlug !== packageEntity.slug) {
                packageEntity.slug = packageInput.newPackageSlug;
                propertiesEdited.push("slug");
            }

            if (packageInput.displayName && packageInput.displayName !== packageEntity.displayName) {
                packageEntity.displayName = packageInput.displayName;
                propertiesEdited.push("displayName");
            }

            if (packageInput.description && packageInput.description !== packageEntity.description) {
                packageEntity.description = packageInput.description;
                propertiesEdited.push("description");
            }

            if (packageInput.isPublic != null && packageInput.isPublic !== packageEntity.isPublic) {
                if (packageInput.isPublic === true && packageEntity.catalog.isPublic === false) {
                    throw new Error("CATALOG_NOT_PUBLIC");
                }
                if (packageEntity.versions == null || packageEntity.versions.length === 0) {
                    throw new Error("PACKAGE_HAS_NO_VERSIONS");
                }
                packageEntity.isPublic = packageInput.isPublic;
                propertiesEdited.push("isPublic");
            }

            validation(packageEntity);

            await transaction.save(packageEntity, { data: { packageInput } });

            // re-query resulting updated person for graphql query result
            // needed to add proper joins
            const queryPackage = await findPackageById(transaction, packageEntity.id, relations);
            if (!queryPackage) {
                throw new Error("Unable to retrieve updated package - this should never happen");
            }

            return [queryPackage, propertiesEdited];
        });
    }

    async updatePackageReadmeVectors(
        identifier: PackageIdentifierInput,
        readmeMarkdown: string | null | undefined
    ): Promise<void> {
        validateIdentifier(identifier);

        await this.manager.nestedTransaction(async (transaction) => {
            const packageEntity = await findPackage(transaction, identifier.catalogSlug, identifier.packageSlug, []);

            if (packageEntity == null) throw new UserInputError("PACKAGE_NOT_FOUND");

            // TODO strip markdown characters before creating vectors?

            if (readmeMarkdown)
                return transaction.query('UPDATE "package" SET readme_file_vectors = to_tsvector($1) WHERE id = $2', [
                    readmeMarkdown,
                    packageEntity.id
                ]);
            else
                return transaction.query('UPDATE "package" SET readme_file_vectors = NULL WHERE id = $1', [
                    packageEntity.id
                ]);
        });
    }

    async deletePackage({
        identifier,
        context
    }: {
        identifier: PackageIdentifierInput;
        context?: AuthenticatedContext;
    }): Promise<void> {
        validateIdentifier(identifier);

        const catalogSlug = identifier.catalogSlug;
        const packageSlug = identifier.packageSlug;
        const packageEntity = await findPackage(this.manager, catalogSlug, packageSlug, ["versions", "catalog"]);
        if (!packageEntity) {
            throw new Error(`PACKAGE_NOT_FOUND  ${catalogSlug}/${packageSlug}`);
        }

        const versions = await this.manager
            .getCustomRepository(VersionRepository)
            .findVersions({ packageId: packageEntity.id, relations: ["package", "package.catalog"] });

        await this.manager.getCustomRepository(VersionRepository).deleteVersions(versions);

        await this.manager.nestedTransaction(async (transaction) => {
            await transaction.delete(PackageEntity, { id: packageEntity.id });
        });

        await ImageStorageService.INSTANCE.deletePackageCoverImage(packageEntity.id);
    }

    async deletePackages({ packages }: { packages: PackageEntity[] }): Promise<void> {
        for (const p of packages) {
            await this.deletePackage({
                identifier: {
                    catalogSlug: p.catalog.slug,
                    packageSlug: p.slug
                }
            });
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
    }): Promise<PackageEntity[]> {
        const ALIAS = "PackageEntity";

        const queryArray = startsWith
            .replace(getEnvVariable("REGISTRY_URL") as string, "")
            .trim()
            .toLowerCase()
            .split(/\s+/)
            .map((s) => `%${s}%`);

        const queryBuilder = this.createQueryBuilderWithUserConditions(user);

        const entities = await queryBuilder

            .andWhere(
                new Brackets((qb) => {
                    qb.where(
                        `(LOWER("PackageEntity"."slug") LIKE :startsWith OR LOWER("PackageEntity"."displayName") like all (array[:...queryArray]))`,
                        {
                            startsWith: startsWith.trim().toLowerCase() + "%",
                            queryArray: queryArray
                        }
                    ).orWhere(
                        `"PackageEntity"."id" IN (SELECT p.id FROM package p JOIN catalog c ON p.catalog_id = c.id WHERE LOWER(CONCAT(c.slug,'/',p.slug)) LIKE :startsWith)`,
                        {
                            startsWith: startsWith.trim().toLowerCase() + "%"
                        }
                    );
                })
            )
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
        user: UserEntity;
        query: string;
        limit: number;
        offSet: number;
        relations?: string[];
    }): Promise<[PackageEntity[], number]> {
        const ALIAS = "PackageEntity";
        return this.createQueryBuilderWithUserConditions(user)
            .andWhere(
                new Brackets((qb) => {
                    qb.where(
                        `(readme_file_vectors @@ websearch_to_tsquery(:query) OR displayName_tokens @@ websearch_to_tsquery(:query) OR description_tokens @@ websearch_to_tsquery(:query) OR "PackageEntity"."slug" LIKE :queryLike OR "PackageEntity"."displayName" LIKE :queryLike)`,
                        {
                            query,
                            queryLike: "%" + query + "%"
                        }
                    ).orWhere(
                        `"PackageEntity"."id" IN (SELECT p.id FROM package p JOIN catalog c ON p.catalog_id = c.id WHERE LOWER(CONCAT(c.slug,'/',p.slug)) LIKE :queryLike)`,
                        {
                            queryLike: "%" + query + "%"
                        }
                    );
                })
            )
            .limit(limit)
            .offset(offSet)
            .addRelations(ALIAS, relations)
            .getManyAndCount();
    }

    async myPackages(
        user: UserEntity,
        limit: number,
        offSet: number,
        relations?: string[]
    ): Promise<[PackageEntity[], number]> {
        const ALIAS = "myPackages";

        const modifiedRelations = [...(relations || [])];

        return this.manager
            .getRepository(PackageEntity)
            .createQueryBuilder("Package")
            .where(`("Package"."creator_id" = :userId)`)
            .orderBy('"Package"."updated_at"', "DESC")
            .limit(limit)
            .offset(offSet)
            .addRelations(ALIAS, modifiedRelations)
            .setParameter("userId", user.id)
            .getManyAndCount();
    }

    async getLatestPackages(
        user: UserEntity,
        limit: number,
        offSet: number,
        relations?: string[]
    ): Promise<[PackageEntity[], number]> {
        const ALIAS = "latestPackages";
        return this.createQueryBuilderWithUserConditions(user)
            .orderBy('"PackageEntity"."created_at"', "DESC")
            .limit(limit)
            .offset(offSet)
            .addRelations(ALIAS, relations)
            .getManyAndCount();
    }

    async getPublicPackages(limit: number, offSet: number, relations?: string[]): Promise<PackageEntity[]> {
        const ALIAS = "PublicPackages";
        return (
            this.createQueryBuilder(ALIAS)
                // .orderBy('"PackageEntity"."created_at"', "DESC") // TODO Sort by views (or popularity)
                .where(`("PublicPackages"."isPublic" = true)`)
                .limit(limit)
                .offset(offSet)
                .addRelations(ALIAS, relations)
                .getMany()
        );
    }

    async countPublicPackages(): Promise<number> {
        const ALIAS = "CountPublicPackages";
        return this.createQueryBuilder(ALIAS).where(`("CountPublicPackages"."isPublic" = true)`).getCount();
    }

    async getPackageOldestUpdated(
        beforeDate: Date,
        offset: number,
        limit: number,
        relations?: string[]
    ): Promise<PackageEntity[]> {
        const ALIAS = "LeastUpdatedPackages";
        return this.createQueryBuilder(ALIAS)
            .offset(offset)
            .limit(limit)
            .addRelations(ALIAS, relations)
            .where('"LeastUpdatedPackages"."last_update_job_date" < :beforeDate', { beforeDate })
            .orderBy('"LeastUpdatedPackages"."last_update_job_date"', "ASC")
            .getMany();
    }
}
