import graphqlFields from "graphql-fields";
import { AuthenticatedContext, Context } from "../context";
import { resolveCatalogPermissions } from "../directive/hasCatalogPermissionDirective";
import { CatalogEntity } from "../entity/CatalogEntity";
import {
    ActivityLogChangeType,
    ActivityLogEventType,
    Base64ImageUpload,
    Catalog,
    CatalogIdentifier,
    CatalogIdentifierInput,
    CreateCatalogInput,
    Permission,
    SetUserCatalogPermissionInput,
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
import { ReservedKeywordsService } from "../service/reserved-keywords-service";

export const catalogEntityToGraphQL = (catalogEntity: CatalogEntity): Catalog => {
    return {
        identifier: {
            catalogSlug: catalogEntity.slug
        }
    };
};

export const catalogIdentifier = async (parent: Catalog, _1: any, context: Context) => {
    const catalog = await context.connection
        .getCustomRepository(CatalogRepository)
        .findCatalogBySlugOrFail(parent.identifier.catalogSlug);

    if (!(await hasCatalogPermissions(context, catalog.id, Permission.VIEW))) {
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
    const catalog = await context.connection
        .getCustomRepository(CatalogRepository)
        .findCatalogBySlugOrFail(parent.identifier.catalogSlug);

    if (!(await hasCatalogPermissions(context, catalog.id, Permission.VIEW))) {
        return null;
    }

    if (catalog.description != null) return catalog.website;

    const catalogEntity = context.connection.getRepository(CatalogEntity).findOneOrFail(catalog.id);

    return (await catalogEntity).website;
};

export const catalogIsPublic = async (parent: Catalog, _1: any, context: Context): Promise<boolean> => {
    const catalog = await context.connection
        .getCustomRepository(CatalogRepository)
        .findCatalogBySlugOrFail(parent.identifier.catalogSlug);

    return catalog.isPublic;
};

export const catalogDisplayName = async (parent: Catalog, _1: any, context: Context) => {
    const catalog = await context.connection
        .getCustomRepository(CatalogRepository)
        .findCatalogBySlugOrFail(parent.identifier.catalogSlug);

    if (!(await hasCatalogPermissions(context, catalog.id, Permission.VIEW))) {
        return "private";
    }

    if (catalog.description != null) return catalog.displayName;

    const catalogEntity = context.connection.getRepository(CatalogEntity).findOneOrFail(catalog.id);

    return (await catalogEntity).displayName;
};

export const catalogDescription = async (parent: Catalog, _1: any, context: Context) => {
    const catalog = await context.connection
        .getCustomRepository(CatalogRepository)
        .findCatalogBySlugOrFail(parent.identifier.catalogSlug);

    if (!(await hasCatalogPermissions(context, catalog.id, Permission.VIEW))) {
        return null;
    }

    if (catalog.description != null) return catalog.description;

    const catalogEntity = context.connection.getRepository(CatalogEntity).findOneOrFail(catalog.id);

    return (await catalogEntity).description;
};

export const catalogCreator = async (parent: Catalog, _1: any, context: Context, info: any) => {
    const catalog = await context.connection
        .getCustomRepository(CatalogRepository)
        .findCatalogBySlugOrFail(parent.identifier.catalogSlug);

    if (!(await hasCatalogPermissions(context, catalog.id, Permission.VIEW))) {
        return null;
    }

    return await context.connection
        .getCustomRepository(UserRepository)
        .findOneOrFail({ where: { id: catalog.creatorId }, relations: getGraphQlRelationName(info) });
};

export const myCatalogPermissions = async (parent: Catalog, _1: any, context: Context) => {
    const catalog = await context.connection
        .getCustomRepository(CatalogRepository)
        .findCatalogBySlugOrFail(parent.identifier.catalogSlug);

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
    const catalog = await context.connection
        .getCustomRepository(CatalogRepository)
        .findCatalogBySlugOrFail(parent.identifier.catalogSlug);

    if (!(await hasCatalogPermissions(context, catalog.id, Permission.VIEW))) {
        return [];
    }

    const packages = await context.connection.getCustomRepository(PackageRepository).catalogPackagesForUser({
        catalogId: catalog.id,
        user: context.me,
        relations: getGraphQlRelationName(info)
    });

    return packages.map((p) => packageEntityToGraphqlObject(context.connection, p));
};

export const createCatalog = async (
    _0: any,
    { value }: { value: CreateCatalogInput },
    context: AuthenticatedContext,
    info: any
) => {
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
        const catalog = await transaction.getCustomRepository(CatalogRepository).updateCatalog({
            identifier,
            value,
            relations: getGraphQlRelationName(info)
        });

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

    const catalog = await context.connection.manager
        .getCustomRepository(CatalogRepository)
        .findCatalogBySlugOrFail(identifier.catalogSlug);
    await ImageStorageService.INSTANCE.saveCatalogAvatarImage(catalog.id, image.base64);
};

export const deleteCatalogAvatarImage = async (
    _0: any,
    { identifier }: { identifier: CatalogIdentifierInput },
    context: AuthenticatedContext,
    info: any
) => {
    const catalog = await context.connection.manager
        .getCustomRepository(CatalogRepository)
        .findCatalogBySlugOrFail(identifier.catalogSlug);
    await ImageStorageService.INSTANCE.deleteCatalogAvatarImage(catalog.id);
};

export const setCatalogCoverImage = async (
    _0: any,
    { identifier, image }: { identifier: CatalogIdentifierInput; image: Base64ImageUpload },
    context: AuthenticatedContext,
    info: any
) => {
    const catalog = await context.connection.manager
        .getCustomRepository(CatalogRepository)
        .findCatalogBySlugOrFail(identifier.catalogSlug);
    await ImageStorageService.INSTANCE.saveCatalogCoverImage(catalog.id, image.base64);
};

export const setUserCatalogPermission = async (
    _0: any,
    { identifier, value }: { identifier: CatalogIdentifierInput; value: SetUserCatalogPermissionInput },
    context: AuthenticatedContext,
    info: any
) => {
    await context.connection.getCustomRepository(UserCatalogPermissionRepository).setUserCatalogPermission({
        identifier,
        value,
        relations: getGraphQlRelationName(info)
    });
};

export const deleteCatalog = async (
    _0: any,
    { identifier }: { identifier: CatalogIdentifierInput },
    context: AuthenticatedContext,
    info: any
) => {
    const catalog = await context.connection.manager
        .getCustomRepository(CatalogRepository)
        .findCatalogBySlugOrFail(identifier.catalogSlug);

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

    return permissions
        .filter((p) => p.catalog != null)
        .map((p) => p.catalog)
        .map((c) => catalogEntityToGraphQL(c));
};
