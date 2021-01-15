import { AuthenticatedContext, Context } from "../context";
import { resolveCatalogPermissions } from "../directive/hasCatalogPermissionDirective";
import { Catalog } from "../entity/Catalog";
import { Permission } from "../generated/graphql";
import { CatalogRepository } from "../repository/CatalogRepository";
import { PackageRepository } from "../repository/PackageRepository";
import { UserRepository } from "../repository/UserRepository";
import { getEnvVariable } from "../util/getEnvVariable";
import { getGraphQlRelationName } from "../util/relationNames";
import { hasCatalogPermissions } from "./UserCatalogPermissionResolver";

export const catalogIdentifier = async (parent: any, _1: any, context: Context) => {
    const catalog = parent as Catalog;

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

export const catalogWebsite = async (parent: any, _1: any, context: Context) => {
    const catalog = parent as Catalog;

    if (!(await hasCatalogPermissions(context, catalog.id, Permission.VIEW))) {
        return null;
    }

    if (catalog.description != null) return catalog.website;

    const catalogEntity = context.connection.getRepository(Catalog).findOneOrFail(catalog.id);

    return (await catalogEntity).website;
};

export const catalogDisplayName = async (parent: any, _1: any, context: Context) => {
    const catalog = parent as Catalog;

    if (!(await hasCatalogPermissions(context, catalog.id, Permission.VIEW))) {
        return "private";
    }

    if (catalog.description != null) return catalog.displayName;

    const catalogEntity = context.connection.getRepository(Catalog).findOneOrFail(catalog.id);

    return (await catalogEntity).displayName;
};

export const catalogDescription = async (parent: any, _1: any, context: Context) => {
    const catalog = parent as Catalog;

    if (!(await hasCatalogPermissions(context, catalog.id, Permission.VIEW))) {
        return null;
    }

    if (catalog.description != null) return catalog.description;

    const catalogEntity = context.connection.getRepository(Catalog).findOneOrFail(catalog.id);

    return (await catalogEntity).description;
};

export const catalogCreator = async (parent: any, _1: any, context: Context, info: any) => {
    const catalog = parent as Catalog;

    if (!(await hasCatalogPermissions(context, catalog.id, Permission.VIEW))) {
        return null;
    }

    return await context.connection
        .getCustomRepository(UserRepository)
        .findOneOrFail({ where: { id: catalog.creatorId }, relations: getGraphQlRelationName(info) });
};

export const myCatalogPermissions = async (parent: any, _1: any, context: Context) => {
    const catalog = parent as Catalog;

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
        catalogs: searchResponse,
        count
    };
};

export const catalogPackagesForUser = async (parent: any, _1: any, context: Context, info: any) => {
    const catalog = parent as Catalog;

    if (!(await hasCatalogPermissions(context, catalog.id, Permission.VIEW))) {
        return [];
    }

    return await context.connection.getCustomRepository(PackageRepository).catalogPackagesForUser({
        catalogId: catalog.id,
        user: context.me,
        relations: getGraphQlRelationName(info)
    });
};
