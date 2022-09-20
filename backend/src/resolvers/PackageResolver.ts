import { ApolloError, ForbiddenError, UserInputError } from "apollo-server";
import graphqlFields from "graphql-fields";
import { AuthenticatedContext, Context } from "../context";
import { PackageEntity } from "../entity/PackageEntity";
import { ActivityLogRepository, createActivityLog } from "../repository/ActivityLogRepository";
import {
    Base64ImageUpload,
    Catalog,
    CatalogIdentifierInput,
    Collection,
    CreatePackageInput,
    Package,
    PackageIdentifier,
    PackageIdentifierInput,
    Permission,
    UpdatePackageInput,
    Version,
    VersionIdentifierInput,
    ActivityLogEventType,
    ActivityLogChangeType,
    ActivityLogResult,
    UpdateMethod
} from "../generated/graphql";
import { getAllPackagePermissions, PackagePermissionRepository } from "../repository/PackagePermissionRepository";
import { PackageRepository } from "../repository/PackageRepository";
import { getGraphQlRelationName, getRelationNames } from "../util/relationNames";
import { ImageStorageService } from "../storage/images/image-storage-service";
import { VersionRepository } from "../repository/VersionRepository";
import { hasCollectionPermissions } from "./UserCollectionPermissionResolver";
import { CatalogRepository } from "../repository/CatalogRepository";
import { hasPackagePermission, resolvePackagePermissions } from "../directive/hasPackagePermissionDirective";
import { versionEntityToGraphqlObject } from "./VersionResolver";
import {
    catalogEntityToGraphQL,
    getCatalogFromCacheOrDbById,
    getCatalogFromCacheOrDbBySlugOrFail
} from "./CatalogResolver";
import { activtyLogEntityToGraphQL } from "./ActivityLogResolver";
import { resolveCatalogPermissionsForEntity } from "../directive/hasCatalogPermissionDirective";
import { Connection, DeleteResult, EntityManager } from "typeorm";
import { VersionEntity } from "../entity/VersionEntity";
import { getUserFromCacheOrDbByIdOrFail } from "./UserResolver";
import { getCollectionFromCacheOrDbOrFail } from "./CollectionResolver";
import { getCatalogPermissionsFromCacheOrDb } from "./UserCatalogPermissionResolver";
import {
    deleteFollowsByIds,
    getPackageFollowsByPackageId,
    getPackageFollowsByPackageIssuesIds
} from "./FollowResolver";
import { PackageIssueRepository } from "../repository/PackageIssueRepository";
import { isAuthenticatedContext } from "../util/contextHelpers";
import { GraphQLResolveInfo } from "graphql";
import { LatestPackagesResult, PackagesResult, SearchPackagesResult, User } from "datapm-client-lib";
import { UserPackagePermissionEntity } from "../entity/UserPackagePermissionEntity";
import { getEnvVariable } from "../util/getEnvVariable";

export const packageEntityToGraphqlObjectOrNull = async (
    context: Context,
    connection: EntityManager | Connection,
    packageEntity: PackageEntity
): Promise<Package | null> => {
    if (!packageEntity) {
        return null;
    }

    return packageEntityToGraphqlObject(context, connection, packageEntity);
};

export const packageEntityToGraphqlObject = async (
    context: Context,
    connection: EntityManager | Connection,
    packageEntity: PackageEntity
): Promise<Package> => {
    if (packageEntity.catalog != null) {
        return {
            identifier: {
                registryURL: getEnvVariable("REGISTRY_URL"),
                catalogSlug: packageEntity.catalog.slug,
                packageSlug: packageEntity.slug
            }
        };
    }

    const packageEntityLoaded = await getPackageFromCacheOrDbByIdOrFail(context, connection, packageEntity.id, true);
    return {
        identifier: {
            registryURL: getEnvVariable("REGISTRY_URL"),
            catalogSlug: packageEntityLoaded.catalog.slug,
            packageSlug: packageEntityLoaded.slug
        }
    };
};

export const usersByPackage = async (
    _0: unknown,
    { identifier }: { identifier: PackageIdentifierInput },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<UserPackagePermissionEntity[]> => {
    const relations = getGraphQlRelationName(info);
    const packageEntity = await getPackageFromCacheOrDbOrFail(context, identifier);

    return await context.connection.manager
        .getCustomRepository(PackagePermissionRepository)
        .usersByPackage(packageEntity, relations);
};

export const myRecentlyViewedPackages = async (
    _0: unknown,
    { limit, offSet }: { limit: number; offSet: number },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<ActivityLogResult> => {
    const relations = getGraphQlRelationName(info);
    const [searchResponse, count] = await context.connection.manager
        .getCustomRepository(ActivityLogRepository)
        .myRecentlyViewedPackages(context.me, limit, offSet, relations);

    return {
        hasMore: count - (offSet + limit) > 0,
        logs: await Promise.all(searchResponse.map((p) => activtyLogEntityToGraphQL(context, context.connection, p))),
        count
    };
};

export const myPackages = async (
    _0: unknown,
    { limit, offset }: { limit: number; offset: number },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<PackagesResult> => {
    const relations = getGraphQlRelationName(info);
    const [searchResponse, count] = await context.connection.manager
        .getCustomRepository(PackageRepository)
        .myPackages(context.me, limit, offset, relations);

    return {
        hasMore: count - (offset + limit) > 0,
        packages: await Promise.all(
            searchResponse.map((p) => packageEntityToGraphqlObject(context, context.connection, p))
        ),
        count
    };
};

export const getLatestPackages = async (
    _0: unknown,
    { limit, offSet }: { limit: number; offSet: number },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<LatestPackagesResult> => {
    const relations = getGraphQlRelationName(info);
    const [searchResponse, count] = await context.connection.manager
        .getCustomRepository(PackageRepository)
        .getLatestPackages(context.me, limit, offSet, relations);

    searchResponse.forEach((p) => context.cache.storePackageToCache(p));
    const resolvedPackages = await Promise.all(
        searchResponse.map((p) => packageEntityToGraphqlObject(context, context.connection, p))
    );

    return {
        hasMore: count - (offSet + limit) > 0,
        packages: resolvedPackages,
        count
    };
};

export const packageVersions = async (
    parent: Package,
    _1: unknown,
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<Version[] | null> => {
    const packageEntity = await getPackageFromCacheOrDbOrFail(context, parent.identifier);
    const versions = await getPackageVersionsFromCacheOrDbById(
        context,
        packageEntity.id,
        getRelationNames(graphqlFields(info))
    );

    if (versions == null) return null;

    return versions.asyncMap(async (v) => await versionEntityToGraphqlObject(context, context.connection, v));
};

export const packageCatalog = async (
    parent: Package,
    _1: unknown,
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<Catalog> => {
    const packageEntity = await getPackageFromCacheOrDbOrFail(context, parent.identifier);
    const catalog = await getCatalogFromCacheOrDbById(
        context,
        packageEntity.catalogId,
        getRelationNames(graphqlFields(info))
    );
    if (!catalog) {
        throw new Error("CATALOG_NOT_FOUND: " + packageEntity.catalogId);
    }

    if (!(await hasPackagePermission(Permission.VIEW, context, parent.identifier))) {
        return {
            identifier: {
                catalogSlug: catalog.slug,
                registryURL: getEnvVariable("REGISTRY_URL")
            }
        };
    }

    return catalogEntityToGraphQL(catalog);
};

export const packageLatestVersion = async (
    parent: Package,
    _1: unknown,
    context: Context,
    info: GraphQLResolveInfo
): Promise<Version | null> => {
    if (!(await hasPackagePermission(Permission.VIEW, context, parent.identifier))) {
        return null;
    }

    const packageEntity = await getPackageFromCacheOrDbOrFail(context, parent.identifier);

    const catalog = await getCatalogFromCacheOrDbById(context, packageEntity.catalogId);
    if (catalog === undefined) {
        throw new ApolloError("Could not find catalog " + packageEntity.catalogId, "CATALOG_NOT_FOUND");
    }

    const version = await getPackageLatestVersionFromCacheOrDbById(
        context,
        packageEntity.id,
        getGraphQlRelationName(info)
    );

    if (version == null) {
        return null;
    }

    return versionEntityToGraphqlObject(context, context.connection, version);
};

export const findPackagesForCollection = async (
    parent: Collection,
    _1: unknown,
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<Package[]> => {
    const collectionEntity = await getCollectionFromCacheOrDbOrFail(
        context,
        context.connection,
        parent.identifier.collectionSlug
    );
    if (!(await hasCollectionPermissions(context, collectionEntity, Permission.VIEW))) {
        return [];
    }

    const packages = await context.connection
        .getCustomRepository(PackageRepository)
        .findPackagesForCollection(context.me?.id, collectionEntity.id, getGraphQlRelationName(info));
    packages.forEach((p) => context.cache.storePackageToCache(p));

    return await Promise.all(packages.map((p) => packageEntityToGraphqlObject(context, context.connection, p)));
};

export const findPackageIdentifier = async (
    parent: Package,
    _1: unknown,
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<PackageIdentifier> => {
    return parent.identifier;
};

export const myPackagePermissions = async (
    parent: Package,
    _0: unknown,
    context: AuthenticatedContext
): Promise<Permission[]> => {
    const packageEntity = await getPackageFromCacheOrDbOrFail(context, parent.identifier);

    const catalog = await getCatalogFromCacheOrDbById(context, packageEntity.catalogId);
    if (catalog == null) {
        throw new Error("CATALOG_NOT_FOUND: " + packageEntity.catalogId);
    }

    return resolvePackagePermissions(
        context,
        {
            catalogSlug: catalog?.slug,
            packageSlug: packageEntity.slug
        },
        context.me
    );
};

export const findPackageCreator = async (
    parent: Package,
    _1: unknown,
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<User> => {
    const packageEntity = await getPackageFromCacheOrDbOrFail(context, parent.identifier);
    return getUserFromCacheOrDbByIdOrFail(
        context,
        context.connection,
        packageEntity.creatorId,
        getGraphQlRelationName(info)
    );
};

export const findPackage = async (
    _0: unknown,
    { identifier }: { identifier: PackageIdentifierInput },
    context: Context,
    info: GraphQLResolveInfo
): Promise<Package> => {
    return context.connection.transaction(async (transaction) => {
        const packageEntity = await getPackageFromCacheOrDbOrFail(context, identifier, getGraphQlRelationName(info));

        packageEntity.viewCount++;
        await transaction.save(packageEntity);

        if (isAuthenticatedContext(context)) {
            await createActivityLog(transaction, {
                userId: (context as AuthenticatedContext).me.id,
                eventType: ActivityLogEventType.PACKAGE_VIEWED,
                targetPackageId: packageEntity.id
            });
        }

        return packageEntityToGraphqlObject(context, context.connection, packageEntity);
    });
};

export const packageFetched = async (
    _0: unknown,
    { identifier }: { identifier: VersionIdentifierInput },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<void> => {
    return await context.connection.transaction(async (transaction) => {
        const packageEntity = await getPackageFromCacheOrDbOrFail(context, identifier, getGraphQlRelationName(info));

        const versionEntity = await transaction.getCustomRepository(VersionRepository).findOneOrFail({ identifier });

        packageEntity.fetchCount++;
        await transaction.save(packageEntity);

        await createActivityLog(transaction, {
            userId: context.me.id,
            eventType: ActivityLogEventType.PACKAGE_FETCHED,
            targetPackageId: packageEntity.id,
            targetPackageVersionId: versionEntity.id
        });
    });
};

export const searchPackages = async (
    _0: unknown,
    { query, limit, offSet }: { query: string; limit: number; offSet: number },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<SearchPackagesResult> => {
    const [searchResponse, count] = await context.connection.manager
        .getCustomRepository(PackageRepository)
        .search({ user: context.me, query, limit, offSet, relations: getRelationNames(graphqlFields(info).packages) });

    return {
        hasMore: count - (offSet + limit) > 0,
        packages: await Promise.all(
            searchResponse.map((p) => packageEntityToGraphqlObject(context, context.connection, p))
        ),
        count
    };
};

export const createPackage = async (
    _0: unknown,
    { value }: { value: CreatePackageInput },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<Package> => {
    return await context.connection.transaction(async (transaction) => {
        try {
            const packageEntity = await transaction.getCustomRepository(PackageRepository).createPackage({
                userId: context.me?.id,
                packageInput: value,
                relations: getGraphQlRelationName(info)
            });

            await createActivityLog(transaction, {
                userId: context.me.id,
                eventType: ActivityLogEventType.PACKAGE_CREATED,
                targetPackageId: packageEntity?.id
            });

            await createActivityLog(transaction, {
                userId: context.me.id,
                eventType: ActivityLogEventType.CATALOG_PACKAGE_ADDED,
                targetCatalogId: packageEntity.catalogId,
                targetPackageId: packageEntity.id
            });

            return await packageEntityToGraphqlObject(context, transaction, packageEntity);
        } catch (error) {
            if (error.message.startsWith("CATALOG_NOT_FOUND")) {
                throw new UserInputError(error.message);
            }

            throw new ApolloError("UNKNOWN_ERROR - " + error.message);
        }
    });
};

export const updatePackage = async (
    _0: unknown,
    { identifier, value }: { identifier: PackageIdentifierInput; value: UpdatePackageInput },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<Package> => {
    if (value.newCatalogSlug) {
        const catalog = await context.connection
            .getCustomRepository(CatalogRepository)
            .findCatalogBySlugOrFail(value.newCatalogSlug);
        // check that this user has the right to move this package to a different catalog
        const hasEditPermission = (await resolveCatalogPermissionsForEntity(context, catalog)).includes(
            Permission.EDIT
        );

        if (!hasEditPermission) {
            throw new ForbiddenError("NOT_AUTHORIZED");
        }
    }

    let packageEntity = await getPackageFromCacheOrDbOrFail(context, identifier, getGraphQlRelationName(info));

    await context.connection.transaction(async (transaction) => {
        const [packageEntityUpdated, propertiesChanged] = await transaction
            .getCustomRepository(PackageRepository)
            .updatePackage({
                catalogSlug: identifier.catalogSlug,
                packageSlug: identifier.packageSlug,
                packageInput: value,
                relations: getGraphQlRelationName(info)
            });

        await createActivityLog(transaction, {
            userId: context.me.id,
            eventType: ActivityLogEventType.PACKAGE_EDIT,
            targetPackageId: packageEntityUpdated.id,
            propertiesEdited: propertiesChanged
        });

        if (value.isPublic !== undefined) {
            await createActivityLog(transaction, {
                userId: context.me.id,
                eventType: ActivityLogEventType.PACKAGE_PUBLIC_CHANGED,
                targetPackageId: packageEntityUpdated.id,
                changeType: value.isPublic
                    ? ActivityLogChangeType.PUBLIC_ENABLED
                    : ActivityLogChangeType.PUBLIC_DISABLED
            });

            if (!value.isPublic) {
                await deletePackageFollowsForUsersWithNoPermissions(packageEntity.id, transaction);
            }
        }
    });

    context.cache.clear();

    if (value.newCatalogSlug || value.newPackageSlug) {
        identifier = {
            catalogSlug: value.newCatalogSlug || identifier.catalogSlug,
            packageSlug: value.newPackageSlug || identifier.packageSlug
        };
    }

    packageEntity = await getPackageFromCacheOrDbOrFail(context, identifier, getGraphQlRelationName(info));

    return packageEntityToGraphqlObject(context, context.connection, packageEntity);
};

export const movePackage = async (
    _0: unknown,
    {
        identifier,
        catalogIdentifier: targetCatalog
    }: { identifier: PackageIdentifierInput; catalogIdentifier: CatalogIdentifierInput },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<void> => {
    return context.connection.transaction(async (transaction) => {
        if (identifier.catalogSlug === targetCatalog.catalogSlug) {
            throw new Error("MOVE_TO_SAME_CATALOG_NOT_ALLOWED");
        }

        const newIdentifier = { catalogSlug: targetCatalog.catalogSlug, packageSlug: identifier.packageSlug };
        const existingPackageInTargetCatalog = await getPackageFromCacheOrDb(context, newIdentifier);
        if (existingPackageInTargetCatalog) {
            throw new Error("PACKAGE_IDENTIFIER_NOT_AVAILABLE");
        }

        const packageEntity = await getPackageFromCacheOrDbOrFail(context, identifier);
        const targetCatalogEntity = await getCatalogFromCacheOrDbBySlugOrFail(
            context,
            transaction,
            targetCatalog.catalogSlug
        );

        packageEntity.catalog = targetCatalogEntity;
        packageEntity.catalogId = targetCatalogEntity.id;

        await transaction
            .getCustomRepository(PackagePermissionRepository)
            .deleteUsersPermissionsByPackageId(packageEntity.id);

        if (!targetCatalogEntity.isPublic) {
            packageEntity.isPublic = false;
            await deletePackageFollowsForUsersWithNoPermissions(packageEntity.id, transaction);
        }

        await transaction.getCustomRepository(PackageRepository).save(packageEntity);

        const userPermission = await getCatalogPermissionsFromCacheOrDb(context, targetCatalogEntity.id, context.me.id);

        await transaction
            .getCustomRepository(PackagePermissionRepository)
            .storePackagePermissions(transaction, context.me.id, packageEntity.id, userPermission);

        // TODO Move the data from the old catalog to the new one
        /* await PackageDataStorageService.INSTANCE.movePackageDataInNewCatalog(
            context,
            identifier.catalogSlug,
            targetCatalog.catalogSlug,
            identifier.packageSlug
        );
        */
    });
};

export const deletePackageFollowsForUsersWithNoPermissions = async (
    packageId: number,
    manager: EntityManager
): Promise<DeleteResult> => {
    const packagePermissions = await getAllPackagePermissions(manager, packageId);
    const packageFollows = await getPackageFollowsByPackageId(packageId, manager);

    const packageIssues = await manager.getCustomRepository(PackageIssueRepository).getAllIssuesByPackage(packageId);
    const packageIssuesIds = packageIssues.map((p) => p.id);
    const packageIssuesFollows = await getPackageFollowsByPackageIssuesIds(packageIssuesIds, manager);

    const allFollows = [...packageFollows, ...packageIssuesFollows];

    const userIds = packagePermissions.map((f) => f.userId);
    const distinctUserIds = new Set(userIds);

    const followsIdsToDelete = allFollows.filter((f) => !distinctUserIds.has(f.userId)).map((f) => f.id);

    return deleteFollowsByIds(followsIdsToDelete, manager);
};

export const setPackageCoverImage = async (
    _0: unknown,
    { identifier, image }: { identifier: PackageIdentifierInput; image: Base64ImageUpload },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<void> => {
    const packageEntity = await getPackageFromCacheOrDbOrFail(context, identifier);
    return ImageStorageService.INSTANCE.savePackageCoverImage(packageEntity.id, image.base64);
};

export const deletePackage = async (
    _0: unknown,
    { identifier }: { identifier: PackageIdentifierInput },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<void> => {
    return context.connection.transaction(async (transaction) => {
        const packageEntity = await transaction.getCustomRepository(PackageRepository).findPackageOrFail({
            identifier
        });

        await createActivityLog(transaction, {
            userId: context.me.id,
            eventType: ActivityLogEventType.PACKAGE_DELETED,
            targetPackageId: packageEntity.id,
            targetCatalogId: packageEntity.catalogId
        });

        await createActivityLog(transaction, {
            userId: context.me.id,
            eventType: ActivityLogEventType.CATALOG_PACKAGE_REMOVED,
            targetCatalogId: packageEntity.catalog.id,
            removedItemName: identifier.catalogSlug + "/" + identifier.packageSlug,
            removedItemId: packageEntity.id
        });

        return transaction.getCustomRepository(PackageRepository).deletePackage({
            identifier,
            context
        });
    });
};

export const userPackages = async (
    _0: unknown,
    { username, limit, offSet }: { username: string; limit: number; offSet: number },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<PackagesResult> => {
    const relations = getGraphQlRelationName(info);
    const [searchResponse, count] = await context.connection.manager
        .getCustomRepository(PackageRepository)
        .userPackages({ user: context.me, username, offSet, limit, relations });

    return {
        hasMore: count - (offSet + limit) > 0,
        packages: await Promise.all(
            searchResponse.map((p) => packageEntityToGraphqlObject(context, context.connection, p))
        ),
        count
    };
};

export const catalogPackages = async (
    _0: unknown,
    { identifier, limit, offset }: { identifier: CatalogIdentifierInput; limit: number; offset: number },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<Package[]> => {
    const repository = context.connection.manager.getCustomRepository(CatalogRepository);
    const catalogEntity = await repository.findCatalogBySlugOrFail(identifier.catalogSlug);
    const relations = getGraphQlRelationName(info);
    const packages = await context.connection.manager
        .getCustomRepository(CatalogRepository)
        .catalogPackages(catalogEntity.id, limit, offset, relations);

    return packages.asyncMap((p) => packageEntityToGraphqlObject(context, context.connection, p));
};

export const packageDescription = async (parent: Package, _1: unknown, context: Context): Promise<string | null> => {
    if (!(await hasPackagePermission(Permission.VIEW, context, parent.identifier))) {
        return null;
    }

    const packageEntity = await getPackageFromCacheOrDbOrFail(context, parent.identifier);

    return packageEntity.description || null;
};

export const packageDisplayName = async (parent: Package, _1: unknown, context: Context): Promise<string | null> => {
    if (!(await hasPackagePermission(Permission.VIEW, context, parent.identifier))) {
        return null;
    }

    const packageEntity = await getPackageFromCacheOrDbOrFail(context, parent.identifier);

    return packageEntity.displayName || null;
};

export const packageCreatedAt = async (parent: Package, _1: unknown, context: Context): Promise<Date | null> => {
    if (!(await hasPackagePermission(Permission.VIEW, context, parent.identifier))) {
        return null;
    }

    const packageEntity = await getPackageFromCacheOrDbOrFail(context, parent.identifier);

    return packageEntity.createdAt || null;
};

export const packageUpdatedAt = async (parent: Package, _1: unknown, context: Context): Promise<Date | null> => {
    if (!(await hasPackagePermission(Permission.VIEW, context, parent.identifier))) {
        return null;
    }

    const packageEntity = await getPackageFromCacheOrDbOrFail(context, parent.identifier);

    return packageEntity.updatedAt || null;
};

export const packageFetchCount = async (parent: Package, _1: unknown, context: Context): Promise<number | null> => {
    if (!(await hasPackagePermission(Permission.VIEW, context, parent.identifier))) {
        return null;
    }

    const packageEntity = await getPackageFromCacheOrDbOrFail(context, parent.identifier);

    return packageEntity.fetchCount || null;
};

export const packageViewedCount = async (parent: Package, _1: unknown, context: Context): Promise<number | null> => {
    if (!(await hasPackagePermission(Permission.VIEW, context, parent.identifier))) {
        return null;
    }

    const packageEntity = await getPackageFromCacheOrDbOrFail(context, parent.identifier);

    return packageEntity.fetchCount || null;
};

export const packageIsPublic = async (parent: Package, _1: unknown, context: Context): Promise<boolean> => {
    const packageEntity = await getPackageFromCacheOrDbOrFail(context, parent.identifier);
    return packageEntity.isPublic;
};

export const packageUpdateMethods = async (
    parent: Package,
    _1: unknown,
    context: Context,
    info: GraphQLResolveInfo
): Promise<UpdateMethod[]> => {
    const packageEntity = await getPackageFromCacheOrDbOrFail(context, parent.identifier);
    const latestVersion = await getPackageLatestVersionFromCacheOrDbById(context, packageEntity.id);

    if (latestVersion == null) return [];

    return latestVersion.updateMethods || [];
};

export const getPackageFromCacheOrDbById = async (
    context: Context,
    connection: EntityManager | Connection,
    packageId: number,
    relations: string[] = []
): Promise<PackageEntity | null> => {
    const packagePromiseFunction = () =>
        connection.getCustomRepository(PackageRepository).findOne(packageId, { relations }) as Promise<PackageEntity>;
    return await context.cache.loadPackage(packageId, packagePromiseFunction);
};

export const getPackageFromCacheOrDbByIdOrFail = async (
    context: Context,
    connection: EntityManager | Connection,
    packageId: number,
    forceReload?: boolean,
    relations: string[] = []
): Promise<PackageEntity> => {
    const packagePromiseFunction = () =>
        connection.getCustomRepository(PackageRepository).findOneOrFail({ id: packageId }, { relations });
    const response = await context.cache.loadPackage(packageId, packagePromiseFunction, forceReload);

    if (response == null) throw new Error("PACKAGE_NOT_FOUND");
    return response;
};

export const getPackageFromCacheOrDb = async (
    context: Context,
    identifier: PackageIdentifier | PackageIdentifierInput,
    relations: string[] = []
): Promise<PackageEntity | null> => {
    const packagePromiseFunction = () =>
        context.connection.manager
            .getCustomRepository(PackageRepository)
            .findPackage({ identifier, relations }) as Promise<PackageEntity>;
    return await context.cache.loadPackageByIdentifier(identifier, packagePromiseFunction);
};

export const getPackageFromCacheOrDbOrFail = async (
    context: Context,
    identifier: PackageIdentifier | PackageIdentifierInput,
    relations: string[] = []
): Promise<PackageEntity> => {
    const packagePromiseFunction = () =>
        context.connection.manager.getCustomRepository(PackageRepository).findPackageOrFail({ identifier, relations });
    const response = await context.cache.loadPackageByIdentifier(identifier, packagePromiseFunction);

    if (response == null) throw new Error("PACKAGE_NOT_FOUND");

    return response;
};

export const getPackageLatestVersionFromCacheOrDbById = async (
    context: Context,
    packageId: number,
    relations: string[] = []
): Promise<VersionEntity | null> => {
    const versionPromiseFunction = () =>
        context.connection.getCustomRepository(VersionRepository).findLatestVersionByPackageId({
            packageId,
            relations
        }) as Promise<VersionEntity>;
    return await context.cache.loadLatestPackageVersion(packageId, versionPromiseFunction);
};

export const getPackageVersionsFromCacheOrDbById = async (
    context: Context,
    packageId: number,
    relations: string[] = []
): Promise<VersionEntity[] | null> => {
    const versionsPromiseFunction = () =>
        context.connection.getCustomRepository(VersionRepository).findVersions({ packageId, relations });
    return await context.cache.loadPackageVersions(packageId, versionsPromiseFunction);
};
