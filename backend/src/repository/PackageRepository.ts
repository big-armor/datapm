import {
    EntityRepository,
    EntityManager,
    Like,
    Brackets,
    SelectQueryBuilder,
    FindOneOptions,
    FindConditions
} from "typeorm";

import { CreatePackageInput, UpdatePackageInput, PackageIdentifierInput, Permission } from "../generated/graphql";
import { Package } from "../entity/Package";

import { UserPackagePermission } from "../entity/UserPackagePermission";
import { Catalog } from "../entity/Catalog";
import { CatalogRepository } from "./CatalogRepository";
import { VersionRepository } from "./VersionRepository";
import { allPermissions } from "../util/PermissionsUtil";
import { User } from "../entity/User";

const PUBLIC_PACKAGES_QUERY = '("Package"."isPublic" is true)';
const AUTHENTICATED_USER_PACKAGES_QUERY = `(("Package"."isPublic" is false and "Package"."catalog_id" in (select uc.catalog_id from user_catalog uc where uc.user_id = :userId))
          or ("Package"."isPublic" is false and "Package".id in (select up.package_id from user_package_permission up where up.user_id = :userId and :permission = ANY(up.permission))))`;
const AUTHENTICATED_USER_OR_PUBLIC_PACKAGES_QUERY = `(${PUBLIC_PACKAGES_QUERY} or ${AUTHENTICATED_USER_PACKAGES_QUERY})`;

async function findPackageById(
    manager: EntityManager,
    packageId: number,
    relations: string[]
): Promise<Package | null> {
    const ALIAS = "package";
    const packageEntity = await manager
        .getRepository(Package)
        .createQueryBuilder(ALIAS)
        .where({ id: packageId, isActive: true })
        .addRelations(ALIAS, relations)
        .getOne();

    return packageEntity || null;
}

async function findPackage(
    manager: EntityManager,
    catalogSlug: string,
    packageSlug: string,
    includeActiveOnly: boolean,
    relations: string[]
): Promise<Package | null> {
    const ALIAS = "package";

    const catalog = await manager.getRepository(Catalog).findOneOrFail({ where: { slug: catalogSlug } });

    const options: FindOneOptions<Package> = {
        where: { catalogId: catalog.id, slug: packageSlug },
        relations: relations
    };

    if (includeActiveOnly) (options.where! as FindConditions<Package>).isActive = true;

    const packageEntity = await manager.getRepository(Package).findOne(options);

    return packageEntity || null;
}

function getNameLength(name: string | undefined | null) {
    return name ? name.trim().length : 0;
}

function validation(packageEntity: Package) {
    if (
        getNameLength(packageEntity.slug) === 0 &&
        getNameLength(packageEntity.displayName) === 0 &&
        getNameLength(packageEntity.description) === 0
    ) {
        throw new Error("You should type the name or package file number at least.");
    }
}

async function setPackageDisabled(packageEntity: Package, transaction: EntityManager) {
    const versions = await transaction
        .getCustomRepository(VersionRepository)
        .findVersions({ packageId: packageEntity.id });

    transaction.getCustomRepository(VersionRepository).disableVersions(versions);

    packageEntity.isActive = false;
    packageEntity.slug = packageEntity.slug + "-DISABLED-" + new Date().getTime();
}

@EntityRepository()
export class PackageRepository {
    constructor(private manager: EntityManager) {}

    public async findPackagesForCollection(
        userId: number,
        collectionId: number,
        relations?: string[]
    ): Promise<Package[]> {
        return this.manager
            .getRepository(Package)
            .createQueryBuilder()
            .where(
                '("Package"."id" IN (SELECT package_id FROM collection_package WHERE collection_id = :collectionId))',
                { collectionId: collectionId }
            )
            .andWhere(AUTHENTICATED_USER_OR_PUBLIC_PACKAGES_QUERY, { userId: userId, permission: Permission.VIEW })
            .addRelations("Package", relations)
            .getMany();
    }

    /** Use this function to create a user scoped query that returns only packages that should be visible to that user */
    public createQueryBuilderWithUserConditions(user: User, permission: Permission = Permission.VIEW) {
        if (user != null) {
            return this.createQueryBuilderWithUserConditionsByUserId(user.id, permission);
        }

        return this.manager.getRepository(Package).createQueryBuilder().where(PUBLIC_PACKAGES_QUERY);
    }

    public createQueryBuilderWithUserConditionsByUserId(userId: number, permission: Permission) {
        return this.manager
            .getRepository(Package)
            .createQueryBuilder()
            .where(AUTHENTICATED_USER_PACKAGES_QUERY, { userId: userId, permission: permission });
    }

    async findOrFail({
        identifier,
        relations = []
    }: {
        identifier: PackageIdentifierInput;
        relations?: string[];
    }): Promise<Package> {
        const catalog = await this.manager.getRepository(Catalog).findOneOrFail({ slug: identifier.catalogSlug });

        const packageEntity = await this.manager
            .getRepository(Package)
            .findOneOrFail({ where: { catalogId: catalog.id, slug: identifier.packageSlug }, relations });

        return packageEntity;
    }

    async catalogPackagesForUser({
        catalogId,
        user,
        relations = []
    }: {
        catalogId: number;
        user: User;
        relations?: string[];
    }): Promise<Package[]> {
        const ALIAS = "packagesForUser";

        const packages = this.createQueryBuilderWithUserConditions(user)
            .andWhere(`"Package"."catalog_id" = :catalogId `, { catalogId: catalogId })
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
    }): Promise<Package> {
        const packageEntity = await findPackageById(this.manager, packageId, relations);

        if (packageEntity === null) throw new Error("PACKAGE_NOT_FOUND");

        return packageEntity;
    }

    async findPackage({
        identifier,
        includeActiveOnly,
        relations = []
    }: {
        identifier: PackageIdentifierInput;
        includeActiveOnly: boolean;
        relations?: string[];
    }): Promise<Package | null> {
        const packageEntity = await findPackage(
            this.manager,
            identifier.catalogSlug,
            identifier.packageSlug,
            includeActiveOnly,
            relations
        );

        return packageEntity;
    }

    async findPackageOrFail({
        identifier,
        includeActiveOnly,
        relations = []
    }: {
        identifier: PackageIdentifierInput;
        relations?: string[];
        includeActiveOnly: boolean;
    }): Promise<Package> {
        const packageEntity = await this.findPackage({ identifier, includeActiveOnly, relations });

        if (packageEntity == null) throw new Error("PACKAGE_NOT_FOUND");

        return packageEntity;
    }

    findPackages({ catalogId }: { catalogId: number }) {
        const PRODUCTS_ALIAS = "packages";
        let query = this.manager
            .getRepository(Package)
            .createQueryBuilder(PRODUCTS_ALIAS)
            .where({ catalogId: catalogId, isActive: true });

        return query.getMany();
    }

    findPackageById({ packageId, relations = [] }: { packageId: number; relations?: string[] }) {
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
    }): Promise<Package> {
        return this.manager.nestedTransaction(async (transaction) => {
            const catalog = await transaction
                .getCustomRepository(CatalogRepository)
                .findCatalogBySlug({ slug: packageInput.catalogSlug });

            if (catalog == undefined) {
                throw new Error("CATALOG_NOT_FOUND");
            }

            const packageEntity = transaction.getRepository(Package).create();

            packageEntity.catalogId = catalog.id;
            packageEntity.displayName = packageInput.displayName;
            packageEntity.slug = packageInput.packageSlug;
            packageEntity.description = packageInput.description || null;
            packageEntity.createdAt = new Date();
            packageEntity.updatedAt = new Date();
            packageEntity.creatorId = userId;
            packageEntity.isActive = true;

            validation(packageEntity);

            const insertedPackage = await transaction.save(packageEntity);

            // add user as package manager of new package
            await transaction.getRepository(UserPackagePermission).insert({
                packageId: insertedPackage.id,
                userId,
                permissions: allPermissions(),
                createdAt: new Date()
            });

            // requery resulting inserted person for graphql query result
            // needed to add proper joins
            const queryPackage = await findPackageById(transaction, insertedPackage.id, relations);
            if (!queryPackage) {
                throw new Error("Unable to retrieve newly created package - this should never happen");
            }

            return queryPackage;
        });
    }

    updatePackage({
        catalogSlug,
        packageSlug,
        packageInput,
        includeActiveOnly,
        relations = []
    }: {
        catalogSlug: string;
        packageSlug: string;
        packageInput: UpdatePackageInput;
        includeActiveOnly: boolean;
        relations?: string[];
    }): Promise<Package> {
        return this.manager.nestedTransaction(async (transaction) => {
            const ALIAS = "package";

            const packageEntity = await findPackage(
                transaction,
                catalogSlug,
                packageSlug,
                includeActiveOnly,
                relations
            );

            if (packageEntity === null) {
                throw new Error("PACKAGE_NOT_FOUND");
            }

            if (packageInput.newCatalogSlug) {
                packageEntity.catalogId = (
                    await transaction
                        .getCustomRepository(CatalogRepository)
                        .findOneOrFail({ slug: packageInput.newCatalogSlug })
                ).id;
            }

            if (packageInput.newPackageSlug) {
                packageEntity.slug = packageInput.newPackageSlug;
            }

            if (packageInput.displayName) packageEntity.displayName = packageInput.displayName;

            if (packageInput.description) packageEntity.description = packageInput.description;

            if (packageInput.isPublic != null) packageEntity.isPublic = packageInput.isPublic;

            validation(packageEntity);

            await transaction.save(packageEntity, { data: { packageInput } });

            // re-query resulting updated person for graphql query result
            // needed to add proper joins
            const queryPackage = await findPackageById(transaction, packageEntity.id, relations);
            if (!queryPackage) {
                throw new Error("Unable to retrieve updated package - this should never happen");
            }

            return queryPackage;
        });
    }

    async disablePackage({
        identifier,
        relations = []
    }: {
        identifier: PackageIdentifierInput;
        relations?: string[];
    }): Promise<Package> {
        const package_ = await this.manager.nestedTransaction(async (transaction) => {
            const ALIAS = "package";

            const catalogSlug = identifier.catalogSlug;
            const packageSlug = identifier.packageSlug;

            const packageEntity = await findPackage(transaction, catalogSlug, packageSlug, false, relations);

            if (!packageEntity) {
                throw new Error(`Could not find Package  ${catalogSlug}/${packageSlug}`);
            }

            setPackageDisabled(packageEntity, transaction);

            await transaction.save(packageEntity);

            return packageEntity;
        });

        return package_;
    }

    async disablePackages({
        packages,
        relations = []
    }: {
        packages: Package[];
        relations?: string[];
    }): Promise<Package[]> {
        return this.manager.nestedTransaction(async (transaction) => {
            const returnValue: Package[] = [];
            packages.forEach(async (p) => {
                setPackageDisabled(p, transaction);
                returnValue.push(await transaction.save(p));
            });

            return returnValue;
        });
    }

    async autocomplete({
        user,
        startsWith,
        relations = []
    }: {
        user: User;
        startsWith: string;
        relations?: string[];
    }): Promise<Package[]> {
        const ALIAS = "autoCompletePackage";

        const entities = this.createQueryBuilderWithUserConditions(user)
            .andWhere('LOWER("Package"."displayName") LIKE \'' + startsWith.toLowerCase() + "%'")
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
    }): Promise<[Package[], number]> {
        const ALIAS = "search";
        return this.createQueryBuilderWithUserConditions(user)
            .andWhere(
                `(displayName_tokens @@ to_tsquery(:query) OR description_tokens @@ to_tsquery(:query) OR slug LIKE :queryLike)`,
                {
                    query,
                    queryLike: query + "%"
                }
            )
            .andWhere(`"Package"."isActive" = true`)
            .limit(limit)
            .offset(offSet)
            .addRelations(ALIAS, relations)
            .getManyAndCount();
    }

    async getLatestPackages(
        user: User,
        limit: number,
        offSet: number,
        relations?: string[]
    ): Promise<[Package[], number]> {
        const ALIAS = "latestPackages";
        return this.createQueryBuilderWithUserConditions(user)
            .orderBy('"Package"."created_at"', "DESC")
            .limit(limit)
            .offset(offSet)
            .addRelations(ALIAS, relations)
            .getManyAndCount();
    }
}
