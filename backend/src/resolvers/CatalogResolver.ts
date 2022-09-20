import { UserInputError, ValidationError } from "apollo-server";
import { Package } from "datapm-client-lib";
import { GraphQLResolveInfo } from "graphql";
import graphqlFields from "graphql-fields";
import { Connection, DeleteResult, EntityManager } from "typeorm";
import { AuthenticatedContext, Context } from "../context";
import { hasCatalogPermission, resolveCatalogPermissions } from "../directive/hasCatalogPermissionDirective";
import { CatalogEntity } from "../entity/CatalogEntity";
import { UserEntity } from "../entity/UserEntity";
import {
    ActivityLogChangeType,
    ActivityLogEventType,
    Base64ImageUpload,
    Catalog,
    CatalogIdentifier,
    CatalogIdentifierInput,
    CreateCatalogInput,
    Permission,
    UpdateCatalogInput
} from "../generated/graphql";
import { createActivityLog } from "../repository/ActivityLogRepository";
import { getAllCatalogPermissions, UserCatalogPermissionRepository } from "../repository/CatalogPermissionRepository";
import { CatalogRepository } from "../repository/CatalogRepository";
import { PackageRepository } from "../repository/PackageRepository";
import { ImageStorageService } from "../storage/images/image-storage-service";
import { isAuthenticatedContext } from "../util/contextHelpers";
import { getEnvVariable } from "../util/getEnvVariable";
import { getGraphQlRelationName, getRelationNames } from "../util/relationNames";
import { deleteFollowsByIds, getCatalogFollowsByCatalogId } from "./FollowResolver";
import { deletePackageFollowsForUsersWithNoPermissions, packageEntityToGraphqlObject } from "./PackageResolver";
import { getUserFromCacheOrDbByIdOrFail } from "./UserResolver";

export const catalogEntityToGraphQLOrNull = (catalogEntity: CatalogEntity): Catalog | null => {
    if (!catalogEntity) {
        return null;
    }

    return catalogEntityToGraphQL(catalogEntity);
};

export const catalogEntityToGraphQL = (catalogEntity: CatalogEntity): Catalog => {
    return {
        identifier: {
            catalogSlug: catalogEntity.slug
        }
    };
};

export const catalogIdentifier = async (parent: Catalog, _1: unknown, context: Context): Promise<CatalogIdentifier> => {
    const catalog = await getCatalogFromCacheOrDbOrFail(context, parent.identifier);

    return {
        registryURL: getEnvVariable("REGISTRY_URL"),
        catalogSlug: catalog.slug
    };
};

export const catalogWebsite = async (parent: Catalog, _1: unknown, context: Context): Promise<string | null> => {
    if (!(await hasCatalogPermission(Permission.VIEW, context, parent.identifier))) {
        return null;
    }

    const catalog = await getCatalogFromCacheOrDbOrFail(context, parent.identifier);
    return catalog.website;
};

export const catalogIsPublic = async (parent: Catalog, _1: unknown, context: Context): Promise<boolean> => {
    const catalog = await getCatalogFromCacheOrDbOrFail(context, parent.identifier);
    return catalog.isPublic;
};

export const catalogIsUnclaimed = async (parent: Catalog, _1: unknown, context: Context): Promise<boolean> => {
    const catalog = await getCatalogFromCacheOrDbOrFail(context, parent.identifier);
    return catalog.unclaimed;
};

export const catalogDisplayName = async (parent: Catalog, _1: unknown, context: Context): Promise<string | null> => {
    const catalog = await getCatalogFromCacheOrDbOrFail(context, parent.identifier);

    if (catalog.displayName != null) {
        return catalog.displayName;
    }

    const catalogEntity = await getCatalogFromCacheOrDbOrFail(context, parent.identifier, [], true);
    return catalogEntity.displayName;
};

export const catalogDescription = async (parent: Catalog, _1: unknown, context: Context): Promise<string | null> => {
    if (!(await hasCatalogPermission(Permission.VIEW, context, parent.identifier))) {
        return null;
    }

    const catalog = await getCatalogFromCacheOrDbOrFail(context, parent.identifier);

    if (catalog.description != null) {
        return catalog.description;
    }

    const catalogEntity = await getCatalogFromCacheOrDbOrFail(context, parent.identifier, [], true);
    return catalogEntity.description;
};

export const catalogCreator = async (
    parent: Catalog,
    _1: unknown,
    context: Context,
    info: GraphQLResolveInfo
): Promise<UserEntity | null> => {
    if (!(await hasCatalogPermission(Permission.VIEW, context, parent.identifier))) {
        return null;
    }

    const catalog = await getCatalogFromCacheOrDbOrFail(context, parent.identifier);

    return await getUserFromCacheOrDbByIdOrFail(
        context,
        context.connection,
        catalog.creatorId,
        getGraphQlRelationName(info)
    );
};

export const myCatalogPermissions = async (parent: Catalog, _1: unknown, context: Context): Promise<Permission[]> => {
    const catalog = await getCatalogFromCacheOrDbOrFail(context, parent.identifier);

    let user: UserEntity | undefined;

    if (isAuthenticatedContext(context)) {
        user = (context as AuthenticatedContext).me;
    }

    return resolveCatalogPermissions(context, { catalogSlug: catalog.slug }, user);
};

export const userCatalogs = async (
    _0: unknown,
    { username, limit, offSet }: { username: string; limit: number; offSet: number },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<{
    hasMore: boolean;
    catalogs: Catalog[];
    count: number;
}> => {
    const relations = getGraphQlRelationName(info);
    const [searchResponse, count] = await context.connection.manager
        .getCustomRepository(CatalogRepository)
        .userCatalogs({ user: context.me, username, offSet: offSet, limit, relations });

    return {
        hasMore: count - (offSet + limit) > 0,
        catalogs: searchResponse.map((c) => catalogEntityToGraphQL(c)),
        count
    };
};

export const catalogPackagesForUser = async (
    parent: Catalog,
    _1: unknown,
    context: Context,
    info: GraphQLResolveInfo
): Promise<Package[]> => {
    const catalog = await getCatalogFromCacheOrDbOrFail(context, parent.identifier);

    const user: UserEntity | undefined = (context as AuthenticatedContext).me;

    const packages = await context.connection.getCustomRepository(PackageRepository).catalogPackagesForUser({
        catalogId: catalog.id,
        user,
        relations: getGraphQlRelationName(info)
    });

    return packages.asyncMap((p) => packageEntityToGraphqlObject(context, context.connection, p));
};

export const createCatalog = async (
    _0: unknown,
    { value }: { value: CreateCatalogInput },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<Catalog> => {
    if (!context.isAdmin && value.unclaimed === true) {
        throw new Error("NOT_AUTHORIZED");
    }

    const catalogEntity = await context.connection.manager.getCustomRepository(CatalogRepository).createCatalog({
        userId: context.me?.id,
        value,
        relations: getGraphQlRelationName(info)
    });

    await createActivityLog(context.connection, {
        userId: context.me.id,
        eventType: ActivityLogEventType.CATALOG_CREATED,
        targetCatalogId: catalogEntity.id
    });

    return catalogEntityToGraphQL(catalogEntity);
};

export const updateCatalog = async (
    _0: unknown,
    { identifier, value }: { identifier: CatalogIdentifierInput; value: UpdateCatalogInput },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<Catalog> => {
    return context.connection.transaction(async (transaction) => {
        if (!context.isAdmin && value.unclaimed != null) {
            throw new Error("NOT_AUTHORIZED - must be admin to set unclaimed status");
        }

        const catalog = await transaction
            .getCustomRepository(CatalogRepository)
            .findCatalogBySlugOrFail(identifier.catalogSlug, ["packages"]);

        if (
            value.isPublic != null &&
            value.isPublic !== catalog.isPublic &&
            !(await hasCatalogPermission(Permission.MANAGE, context, identifier))
        ) {
            throw new ValidationError("NOT_AUTHORIZED - must be manager to set public status");
        }

        const [updatedCatalog, propertiesChanged] = await transaction
            .getCustomRepository(CatalogRepository)
            .updateCatalog({
                identifier,
                value,
                relations: getGraphQlRelationName(info)
            });

        const relations = getGraphQlRelationName(info);
        if (!relations.includes("packages")) {
            relations.push("packages");
        }

        context.cache.storeCatalogToCache(updatedCatalog);

        if (propertiesChanged.includes("unclaimed")) {
            await createActivityLog(transaction, {
                userId: context.me.id,
                eventType: ActivityLogEventType.CATALOG_UNCLAIMED_CHANGED,
                targetCatalogId: catalog.id,
                changeType: value.unclaimed
                    ? ActivityLogChangeType.UNCLAIMED_ENABLED
                    : ActivityLogChangeType.UNCLAIMED_DISABLED
            });
        }

        if (propertiesChanged.length > 0) {
            await createActivityLog(transaction, {
                userId: context.me.id,
                eventType: ActivityLogEventType.CATALOG_EDIT,
                targetCatalogId: updatedCatalog.id,
                propertiesEdited: propertiesChanged
            });
        }
        if (propertiesChanged.includes("isPublic")) {
            await createActivityLog(transaction, {
                userId: context.me.id,
                eventType: ActivityLogEventType.CATALOG_PUBLIC_CHANGED,
                targetCatalogId: updatedCatalog.id,
                changeType: value.isPublic
                    ? ActivityLogChangeType.PUBLIC_ENABLED
                    : ActivityLogChangeType.PUBLIC_DISABLED
            });
        }

        if (!value.isPublic) {
            await deleteCatalogFollowsForUsersWithNoPermissions(catalog.id, transaction);
            const packageFollowRemovalPromises = catalog.packages.map((pkg) =>
                deletePackageFollowsForUsersWithNoPermissions(pkg.id, transaction)
            );
            await Promise.all(packageFollowRemovalPromises);
        }

        return catalogEntityToGraphQL(updatedCatalog);
    });
};

export const deleteCatalogFollowsForUsersWithNoPermissions = async (
    catalogId: number,
    manager: EntityManager
): Promise<DeleteResult> => {
    const catalogPermissions = await getAllCatalogPermissions(manager, catalogId);
    const follows = await getCatalogFollowsByCatalogId(catalogId, manager);

    const userIds = catalogPermissions.map((f) => f.userId);
    const distinctUserIds = new Set(userIds);

    const followsIdsToDelete = follows.filter((f) => !distinctUserIds.has(f.userId)).map((f) => f.id);

    return deleteFollowsByIds(followsIdsToDelete, manager);
};

export const setCatalogAvatarImage = async (
    _0: unknown,
    { identifier, image }: { identifier: CatalogIdentifierInput; image: Base64ImageUpload },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<void> => {
    if (identifier.catalogSlug === context.me.username) {
        throw new Error("AVATAR_NOT_ALLOWED_ON_USER_CATALOGS");
    }

    const catalog = await getCatalogFromCacheOrDbOrFail(context, identifier);
    await ImageStorageService.INSTANCE.saveCatalogAvatarImage(catalog.id, image.base64);
};

export const deleteCatalogAvatarImage = async (
    _0: unknown,
    { identifier }: { identifier: CatalogIdentifierInput },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<void> => {
    const catalog = await getCatalogFromCacheOrDbOrFail(context, identifier);
    await ImageStorageService.INSTANCE.deleteCatalogAvatarImage(catalog.id);
};

export const setCatalogCoverImage = async (
    _0: unknown,
    { identifier, image }: { identifier: CatalogIdentifierInput; image: Base64ImageUpload },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<void> => {
    const catalog = await getCatalogFromCacheOrDbOrFail(context, identifier);
    await ImageStorageService.INSTANCE.saveCatalogCoverImage(catalog.id, image.base64);
};

export const deleteCatalog = async (
    _0: unknown,
    { identifier }: { identifier: CatalogIdentifierInput },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<void> => {
    const catalog = await getCatalogFromCacheOrDbOrFail(context, identifier);
    await createActivityLog(context.connection, {
        userId: context.me.id,
        eventType: ActivityLogEventType.CATALOG_DELETED,
        targetCatalogId: catalog.id
    });

    await context.connection.manager.getCustomRepository(CatalogRepository).deleteCatalog({
        slug: identifier.catalogSlug
    });
};

export const searchCatalogs = async (
    _0: unknown,
    { query, limit, offSet }: { query: string; limit: number; offSet: number },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<{ hasMore: boolean; catalogs: Catalog[]; count: number }> => {
    const [searchResponse, count] = await context.connection.manager.getCustomRepository(CatalogRepository).search({
        user: context.me,
        query,
        limit,
        offSet,
        relations: getRelationNames(graphqlFields(info).catalogs)
    });

    return {
        hasMore: count - (offSet + limit) > 0,
        catalogs: await Promise.all(searchResponse.map(async (c) => catalogEntityToGraphQL(c))),
        count
    };
};

export const myCatalogs = async (_0: unknown, _1: unknown, context: AuthenticatedContext): Promise<Catalog[]> => {
    const permissions = await context.connection.manager
        .getCustomRepository(UserCatalogPermissionRepository)
        .findByUser({ username: context.me?.username, relations: ["catalog"] });

    const catalogs = permissions.filter((p) => p.catalog != null).map((p) => p.catalog);

    if (context.isAdmin) {
        const unclaimedCatalogs = await context.connection.manager
            .getCustomRepository(CatalogRepository)
            .findAllUnclaimed();

        const filteredUnclaimedCatalogs = unclaimedCatalogs.filter((c) => !catalogs.some((c2) => c2.id === c.id));

        catalogs.push(...filteredUnclaimedCatalogs);
    }

    return catalogs.map((c) => catalogEntityToGraphQL(c));
};

export const getCatalogByIdentifierOrFail = async (
    _0: unknown,
    { identifier }: { identifier: CatalogIdentifierInput },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<Catalog> => {
    const graphQLRelationName = info ? getGraphQlRelationName(info) : [];
    const catalog = await getCatalogFromCacheOrDbBySlug(
        context,
        context.connection,
        identifier.catalogSlug,
        graphQLRelationName
    );

    if (catalog == null) {
        throw new UserInputError("CATALOG_NOT_FOUND: " + identifier.catalogSlug);
    }

    return catalogEntityToGraphQL(catalog);
};

export const getCatalogByIdentifier = async (
    _0: unknown,
    { identifier }: { identifier: CatalogIdentifierInput },
    context: AuthenticatedContext,
    relations: string[] = []
): Promise<Catalog | undefined> => {
    const catalog = await getCatalogFromCacheOrDbBySlug(context, context.connection, identifier.catalogSlug, relations);

    if (catalog == null) {
        return undefined;
    }

    return catalogEntityToGraphQL(catalog);
};

export const getCatalogFromCacheOrDbById = async (
    context: Context,
    catalogId: number,
    relations: string[] = []
): Promise<CatalogEntity | null> => {
    // TODO Make this return a Catalog and not CatalogEntity

    const catalogPromiseFunction = () =>
        context.connection.manager.getCustomRepository(CatalogRepository).findOne(catalogId, { relations }) as Promise<
            CatalogEntity
        >;

    return await context.cache.loadCatalog(catalogId, catalogPromiseFunction);
};

export const getCatalogFromCacheOrDbByIdOrFail = async (
    context: Context,
    connection: EntityManager | Connection,
    catalogId: number,
    relations: string[] = []
): Promise<CatalogEntity> => {
    // TODO Make this return a Catalog and not CatalogEntity
    const catalogPromiseFunction = () =>
        connection.getCustomRepository(CatalogRepository).findOneOrFail(catalogId, { relations });

    const response = await context.cache.loadCatalog(catalogId, catalogPromiseFunction);

    if (response == null) {
        throw new Error("CATALOG_NOT_FOUND - " + catalogId);
    }

    return response;
};

export const getCatalogFromCacheOrDbOrFail = async (
    context: Context,
    identifier: CatalogIdentifier | CatalogIdentifierInput,
    // TODO fix this parameter ordering
    // eslint-disable-next-line default-param-last
    relations: string[] = [],
    forceReload?: boolean
): Promise<CatalogEntity> => {
    // TODO Make this return a Catalog and not CatalogEntity

    const catalogPromiseFunction = () =>
        context.connection.manager
            .getCustomRepository(CatalogRepository)
            .findCatalogBySlugOrFail(identifier.catalogSlug, relations);

    const response = await context.cache.loadCatalogBySlug(identifier.catalogSlug, catalogPromiseFunction, forceReload);

    if (response == null) {
        throw new Error("CATALOG_NOT_FOUND - " + identifier.catalogSlug);
    }

    return response;
};

export const getCatalogFromCacheOrDbBySlug = async (
    context: Context,
    connection: EntityManager | Connection,
    slug: string,
    relations?: string[]
): Promise<CatalogEntity | null> => {
    // TODO Make this return a Catalog and not CatalogEntity

    const catalogPromiseFunction = () =>
        connection.getCustomRepository(CatalogRepository).findCatalogBySlug({ slug, relations }) as Promise<
            CatalogEntity
        >;

    return await context.cache.loadCatalogBySlug(slug, catalogPromiseFunction);
};

export const getCatalogFromCacheOrDbBySlugOrFail = async (
    context: Context,
    connection: EntityManager | Connection,
    slug: string,
    relations?: string[]
): Promise<CatalogEntity> => {
    // TODO Make this return a Catalog and not CatalogEntity

    const response = await getCatalogFromCacheOrDbBySlug(context, connection, slug, relations);

    if (response == null) {
        throw new Error("CATALOG_NOT_FOUND - " + slug);
    }

    return response;
};
