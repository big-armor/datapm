import { UserInputError } from "apollo-server";
import graphqlFields from "graphql-fields";
import { Connection, EntityManager } from "typeorm";
import { AuthenticatedContext, Context } from "../context";
import { resolveCatalogPermissions } from "../directive/hasCatalogPermissionDirective";
import { CatalogEntity } from "../entity/CatalogEntity";
import { UserCatalogPermissionEntity } from "../entity/UserCatalogPermissionEntity";
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
import { UserCatalogPermissionRepository } from "../repository/CatalogPermissionRepository";
import { CatalogRepository } from "../repository/CatalogRepository";
import { PackageRepository } from "../repository/PackageRepository";
import { UserRepository } from "../repository/UserRepository";
import { ImageStorageService } from "../storage/images/image-storage-service";
import { getEnvVariable } from "../util/getEnvVariable";
import { getGraphQlRelationName, getRelationNames } from "../util/relationNames";
import { packageEntityToGraphqlObject } from "./PackageResolver";
import { hasCatalogPermissions } from "./UserCatalogPermissionResolver";
import { getUserFromCacheOrDbById } from "./UserResolver";

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

export const catalogIdentifier = async (parent: Catalog, _1: any, context: Context) => {
    const catalog = await getCatalogFromCacheOrDbOrFail(context, parent.identifier);
    if (!(await hasCatalogPermissions(context, catalog, Permission.VIEW))) {
        return {
            catalogSlug: "private",
            registryURL: getEnvVariable("REGISTRY_URL")
        };
    }

    return {
        registryURL: getEnvVariable("REGISTRY_URL"),
        catalogSlug: catalog.slug
    };
};

export const catalogWebsite = async (parent: Catalog, _1: any, context: Context) => {
    const catalog = await getCatalogFromCacheOrDbOrFail(context, parent.identifier);
    if (!(await hasCatalogPermissions(context, catalog, Permission.VIEW))) {
        return null;
    }

    return catalog.website;
};

export const catalogIsPublic = async (parent: Catalog, _1: any, context: Context): Promise<boolean> => {
    const catalog = await getCatalogFromCacheOrDbOrFail(context, parent.identifier);
    return catalog.isPublic;
};

export const catalogIsUnclaimed = async (parent: Catalog, _1: any, context: Context): Promise<boolean> => {
    const catalog = await getCatalogFromCacheOrDbOrFail(context, parent.identifier);
    return catalog.unclaimed;
};

export const catalogDisplayName = async (parent: Catalog, _1: any, context: Context) => {
    const catalog = await getCatalogFromCacheOrDbOrFail(context, parent.identifier);
    if (!(await hasCatalogPermissions(context, catalog, Permission.VIEW))) {
        return "private";
    }

    if (catalog.description != null) {
        return catalog.displayName;
    }

    const catalogEntity = await getCatalogFromCacheOrDbOrFail(context, parent.identifier, true);
    return catalogEntity.displayName;
};

export const catalogDescription = async (parent: Catalog, _1: any, context: Context) => {
    const catalog = await getCatalogFromCacheOrDbOrFail(context, parent.identifier);
    if (!(await hasCatalogPermissions(context, catalog, Permission.VIEW))) {
        return null;
    }

    if (catalog.description != null) {
        return catalog.description;
    }

    const catalogEntity = await getCatalogFromCacheOrDbOrFail(context, parent.identifier, true);
    return catalogEntity.description;
};

export const catalogCreator = async (parent: Catalog, _1: any, context: Context, info: any) => {
    const catalog = await getCatalogFromCacheOrDbOrFail(context, parent.identifier);
    if (!(await hasCatalogPermissions(context, catalog, Permission.VIEW))) {
        return null;
    }

    return await getUserFromCacheOrDbById(context, context.connection, catalog.creatorId, getGraphQlRelationName(info));
};

export const myCatalogPermissions = async (parent: Catalog, _1: any, context: Context) => {
    const catalog = await getCatalogFromCacheOrDbOrFail(context, parent.identifier);
    return resolveCatalogPermissions(context, { catalogSlug: catalog.slug }, context.me);
};

export const userCatalogs = async (
    _0: any,
    { username, limit, offSet }: { username: string; limit: number; offSet: number },
    context: AuthenticatedContext,
    info: any
) => {
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

export const catalogPackagesForUser = async (parent: Catalog, _1: any, context: Context, info: any) => {
    const catalog = await getCatalogFromCacheOrDbOrFail(context, parent.identifier);
    if (!(await hasCatalogPermissions(context, catalog, Permission.VIEW))) {
        return [];
    }

    const packages = await context.connection.getCustomRepository(PackageRepository).catalogPackagesForUser({
        catalogId: catalog.id,
        user: context.me,
        relations: getGraphQlRelationName(info)
    });

    return packages.map((p) => packageEntityToGraphqlObject(context, context.connection, p));
};

export const createCatalog = async (
    _0: any,
    { value }: { value: CreateCatalogInput },
    context: AuthenticatedContext,
    info: any
) => {
    if (!context.me.isAdmin && value.unclaimed === true) {
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
    _0: any,
    { identifier, value }: { identifier: CatalogIdentifierInput; value: UpdateCatalogInput },
    context: AuthenticatedContext,
    info: any
) => {
    return context.connection.transaction(async (transaction) => {
        if (!context.me.isAdmin && value.unclaimed !== undefined) {
            throw new Error("NOT_AUTHORIZED");
        }

        const catalog = await transaction.getCustomRepository(CatalogRepository).updateCatalog({
            identifier,
            value,
            relations: getGraphQlRelationName(info)
        });

        if (value.unclaimed !== undefined) {
            await createActivityLog(transaction, {
                userId: context.me.id,
                eventType: ActivityLogEventType.CATALOG_PUBLIC_CHANGED,
                targetCatalogId: catalog.id,
                changeType: value.unclaimed
                    ? ActivityLogChangeType.UNCLAIMED_ENABLED
                    : ActivityLogChangeType.UNCLAIMED_DISABLED
            });
        }

        await createActivityLog(transaction, {
            userId: context.me.id,
            eventType: ActivityLogEventType.CATALOG_EDIT,
            targetCatalogId: catalog.id,
            propertiesEdited: Object.keys(value).map((k) => (k == "newSlug" ? "slug" : k))
        });

        if (value.isPublic !== undefined) {
            await createActivityLog(transaction, {
                userId: context.me.id,
                eventType: ActivityLogEventType.CATALOG_PUBLIC_CHANGED,
                targetCatalogId: catalog.id,
                changeType: value.isPublic
                    ? ActivityLogChangeType.PUBLIC_ENABLED
                    : ActivityLogChangeType.PUBLIC_DISABLED
            });
        }

        if (value.isPublic !== undefined) {
            await createActivityLog(transaction, {
                userId: context.me.id,
                eventType: ActivityLogEventType.CATALOG_PUBLIC_CHANGED,
                targetCatalogId: catalog.id,
                changeType: value.isPublic
                    ? ActivityLogChangeType.PUBLIC_ENABLED
                    : ActivityLogChangeType.PUBLIC_DISABLED
            });
        }

        return catalogEntityToGraphQL(catalog);
    });
};

export const setCatalogAvatarImage = async (
    _0: any,
    { identifier, image }: { identifier: CatalogIdentifierInput; image: Base64ImageUpload },
    context: AuthenticatedContext,
    info: any
) => {
    if (identifier.catalogSlug === context.me.username) {
        throw new Error("AVATAR_NOT_ALLOWED_ON_USER_CATALOGS");
    }

    const catalog = await getCatalogFromCacheOrDbOrFail(context, identifier);
    await ImageStorageService.INSTANCE.saveCatalogAvatarImage(catalog.id, image.base64);
};

export const deleteCatalogAvatarImage = async (
    _0: any,
    { identifier }: { identifier: CatalogIdentifierInput },
    context: AuthenticatedContext,
    info: any
) => {
    const catalog = await getCatalogFromCacheOrDbOrFail(context, identifier);
    await ImageStorageService.INSTANCE.deleteCatalogAvatarImage(catalog.id);
};

export const setCatalogCoverImage = async (
    _0: any,
    { identifier, image }: { identifier: CatalogIdentifierInput; image: Base64ImageUpload },
    context: AuthenticatedContext,
    info: any
) => {
    const catalog = await getCatalogFromCacheOrDbOrFail(context, identifier);
    await ImageStorageService.INSTANCE.saveCatalogCoverImage(catalog.id, image.base64);
};

export const deleteCatalog = async (
    _0: any,
    { identifier }: { identifier: CatalogIdentifierInput },
    context: AuthenticatedContext,
    info: any
) => {
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
    _0: any,
    { query, limit, offSet }: { query: string; limit: number; offSet: number },
    context: AuthenticatedContext,
    info: any
) => {
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

export const myCatalogs = async (_0: any, {}, context: AuthenticatedContext) => {
    const permissions = await context.connection.manager
        .getCustomRepository(UserCatalogPermissionRepository)
        .findByUser({ username: context.me?.username, relations: ["catalog"] });

    const catalogs = permissions.filter((p) => p.catalog != null).map((p) => p.catalog);

    if (context.me.isAdmin) {
        const unclaimedCatalogs = await context.connection.manager
            .getCustomRepository(CatalogRepository)
            .findAllUnclaimed();
        catalogs.push(...unclaimedCatalogs);
    }

    return catalogs.map((c) => catalogEntityToGraphQL(c));
};

export const getCatalogByIdentifierOrFail = async (
    _0: any,
    { identifier }: { identifier: CatalogIdentifierInput },
    context: AuthenticatedContext,
    info: any
) => {
    const graphQLRelationName = info ? getGraphQlRelationName(info) : [];
    const catalog = await getCatalogFromCacheOrDbBySlug(context, identifier.catalogSlug, graphQLRelationName);

    if (catalog == null) {
        throw new UserInputError("CATALOG_NOT_FOUND");
    }

    return catalogEntityToGraphQL(catalog);
};

export const getCatalogByIdentifier = async (
    _0: any,
    { identifier }: { identifier: CatalogIdentifierInput },
    context: AuthenticatedContext,
    info: any
) => {
    const graphQLRelationName = info ? getGraphQlRelationName(info) : [];
    const catalog = await getCatalogFromCacheOrDbBySlug(context, identifier.catalogSlug, graphQLRelationName);

    if (catalog == null) {
        return undefined;
    }

    return catalogEntityToGraphQL(catalog);
};

export const getCatalogFromCacheOrDbById = async (context: Context, catalogId: number, relations: string[] = []) => {
    const catalogPromise = context.connection.manager
        .getCustomRepository(CatalogRepository)
        .findOne(catalogId, { relations }) as Promise<CatalogEntity>;

    return await context.cache.loadCatalog(catalogId, catalogPromise);
};

export const getCatalogFromCacheOrDbByIdOrFail = async (
    context: Context,
    connection: EntityManager | Connection,
    catalogId: number,
    relations: string[] = []
) => {
    const catalogPromise = connection.getCustomRepository(CatalogRepository).findOneOrFail(catalogId, { relations });

    return await context.cache.loadCatalog(catalogId, catalogPromise);
};

export const getCatalogFromCacheOrDbOrFail = async (
    context: Context,
    identifier: CatalogIdentifier | CatalogIdentifierInput,
    forceReload?: boolean
) => {
    const catalogPromise = context.connection.manager
        .getCustomRepository(CatalogRepository)
        .findCatalogBySlugOrFail(identifier.catalogSlug);

    return await context.cache.loadCatalogBySlug(identifier.catalogSlug, catalogPromise, forceReload);
};

export const getCatalogFromCacheOrDbBySlug = async (context: Context, slug: string, relations?: string[]) => {
    const catalogPromise = context.connection.manager
        .getCustomRepository(CatalogRepository)
        .findCatalogBySlug({ slug, relations }) as Promise<CatalogEntity>;

    return await context.cache.loadCatalogBySlug(slug, catalogPromise);
};
