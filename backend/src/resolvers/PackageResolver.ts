import { ApolloError, ForbiddenError, UserInputError } from "apollo-server";
import graphqlFields from "graphql-fields";
import { AuthenticatedContext } from "../context";
import { Catalog } from "../entity/Catalog";
import { Collection } from "../entity/Collection";
import { Package } from "../entity/Package";
import { CreatePackageInput, PackageIdentifierInput, Permission, UpdatePackageInput } from "../generated/graphql";
import { UserCatalogPermissionRepository } from "../repository/CatalogPermissionRepository";
import { PackagePermissionRepository } from "../repository/PackagePermissionRepository";
import { PackageRepository } from "../repository/PackageRepository";
import { UserRepository } from "../repository/UserRepository";
import { getEnvVariable } from "../util/getEnvVariable";
import { getGraphQlRelationName, getRelationNames } from "../util/relationNames";

export const getLatestPackages = async (
    _0: any,
    { limit, offSet }: { limit: number; offSet: number },
    context: AuthenticatedContext,
    info: any
) => {
    const relations = getGraphQlRelationName(info);
    const [searchResponse, count] = await context.connection.manager
        .getCustomRepository(PackageRepository)
        .getLatestPackages(context.me, limit, offSet, relations);

    return {
        hasMore: count - (offSet + limit) > 0,
        packages: searchResponse,
        count
    };
};

export const catalogPackagesForUser = async (parent: any, _1: any, context: AuthenticatedContext, info: any) => {
    const catalog = parent as Catalog;

    return await context.connection.getCustomRepository(PackageRepository).catalogPackagesForUser({
        catalogId: catalog.id,
        user: context.me,
        relations: getGraphQlRelationName(info)
    });
};

export const findPackagesForCollection = async (parent: any, _1: any, context: AuthenticatedContext, info: any) => {
    const collection = parent as Collection;

    return await context.connection
        .getCustomRepository(PackageRepository)
        .findPackagesForCollection(context.me?.id, collection.id, getGraphQlRelationName(info));
};

export const findPackageIdentifier = async (parent: any, _1: any, context: AuthenticatedContext, info: any) => {
    const packageEntity = parent as Package;
    const catalog = await context.connection.getRepository(Catalog).findOneOrFail({ id: packageEntity.catalogId });

    return {
        registryHostname: getEnvVariable("REGISTRY_HOSTNAME"),
        registryPort: Number.parseInt(getEnvVariable("REGISTRY_PORT")),
        catalogSlug: catalog.slug,
        packageSlug: packageEntity.slug
    };
};

export const findPackageCreator = async (parent: any, _1: any, context: AuthenticatedContext, info: any) => {
    const packageEntity = parent as Package;

    return await context.connection.getCustomRepository(UserRepository).findOneOrFail({
        where: { id: packageEntity.creatorId },
        relations: getGraphQlRelationName(info)
    });
};

export const findPackage = async (
    _0: any,
    { identifier }: { identifier: PackageIdentifierInput },
    context: AuthenticatedContext,
    info: any
) => {
    const packageEntity = await context.connection.getCustomRepository(PackageRepository).findPackage({
        identifier,
        includeActiveOnly: true,
        relations: getGraphQlRelationName(info)
    });

    if (packageEntity == null) throw new UserInputError("PACKAGE_NOT_FOUND");

    return packageEntity;
};

export const searchPackages = async (
    _0: any,
    { query, limit, offSet }: { query: string; limit: number; offSet: number },
    context: AuthenticatedContext,
    info: any
) => {
    const [searchResponse, count] = await context.connection.manager
        .getCustomRepository(PackageRepository)
        .search({ user: context.me, query, limit, offSet, relations: getRelationNames(graphqlFields(info).packages) });

    return {
        hasMore: count - (offSet + limit) > 0,
        packages: searchResponse,
        count
    };
};

export const createPackage = async (
    _0: any,
    { value }: { value: CreatePackageInput },
    context: AuthenticatedContext,
    info: any
) => {
    try {
        return await context.connection.getCustomRepository(PackageRepository).createPackage({
            userId: context.me?.id,
            packageInput: value,
            relations: getGraphQlRelationName(info)
        });
    } catch (error) {
        if (error.message == "CATALOG_NOT_FOUND") {
            throw new UserInputError("CATALOG_NOT_FOUND");
        }

        throw new ApolloError("UNKNOWN_ERROR");
    }
};

export const updatePackage = async (
    _0: any,
    { identifier, value }: { identifier: PackageIdentifierInput; value: UpdatePackageInput },
    context: AuthenticatedContext,
    info: any
) => {
    if (value.newCatalogSlug) {
        // check that this user has the right to move this package to a different catalog
        const hasPermission = await context.connection
            .getCustomRepository(UserCatalogPermissionRepository)
            .userHasPermission({
                username: context.me.username,
                catalogSlug: value.newCatalogSlug,
                permission: Permission.EDIT
            });

        if (!hasPermission) {
            throw new ForbiddenError("NOT_AUTHORIZED");
        }
    }

    return context.connection.getCustomRepository(PackageRepository).updatePackage({
        catalogSlug: identifier.catalogSlug,
        packageSlug: identifier.packageSlug,
        packageInput: value,
        includeActiveOnly: true,
        relations: getGraphQlRelationName(info)
    });
};

export const disablePackage = async (
    _0: any,
    { identifier }: { identifier: PackageIdentifierInput },
    context: AuthenticatedContext,
    info: any
) => {
    return context.connection.getCustomRepository(PackageRepository).disablePackage({
        identifier,
        relations: getGraphQlRelationName(info)
    });
};

export const setPackagePermissions = async (
    _0: any,
    {
        identifier,
        value: { username, permissions }
    }: { identifier: PackageIdentifierInput; value: { username: string; permissions: Permission[] } },
    context: AuthenticatedContext,
    info: any
) => {
    return context.connection.getCustomRepository(PackagePermissionRepository).setPackagePermissions({
        identifier,
        username,
        permissions,
        relations: getGraphQlRelationName(info)
    });
};

export const removePackagePermissions = async (
    _0: any,
    { identifier, username }: { identifier: PackageIdentifierInput; username: string },
    context: AuthenticatedContext
) => {
    context.connection.getCustomRepository(PackagePermissionRepository).removePackagePermission({
        identifier,
        username
    });
};
