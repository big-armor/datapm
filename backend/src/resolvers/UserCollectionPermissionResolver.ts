import { AuthenticatedContext } from "../context";
import { Permission, CollectionIdentifierInput, SetUserCollectionPermissionInput } from "../generated/graphql";
import { UserCollectionPermissionRepository } from "../repository/UserCollectionPermissionRepository";
import { getGraphQlRelationName } from "../util/relationNames";

export const hasCollectionPermissions = async (
    context: AuthenticatedContext,
    collectionId: number,
    permission: Permission
) => {
    return context.connection
        .getCustomRepository(UserCollectionPermissionRepository)
        .hasPermission(context.me.id, collectionId, permission);
};

export const grantAllCollectionPermissionsForUser = async (context: AuthenticatedContext, collectionId: number) => {
    return context.connection
        .getCustomRepository(UserCollectionPermissionRepository)
        .grantAllPermissionsForUser(context.me.id, collectionId);
};

export const setPermissionsForUser = async (
    context: AuthenticatedContext,
    collectionId: number,
    permissions: Permission[]
) => {
    return context.connection
        .getCustomRepository(UserCollectionPermissionRepository)
        .setPermissionsForUser(context.me.id, collectionId, permissions);
};

export const myCollectionPermission = async (
    _0: any,
    { identifier }: { identifier: CollectionIdentifierInput },
    context: AuthenticatedContext,
    info: any
) => {
    return await context.connection
        .getCustomRepository(UserCollectionPermissionRepository)
        .myCollectionPermission(context.me, identifier);
};

export const setUserCollectionPermission = async (
    _0: any,
    { identifier, value }: { identifier: CollectionIdentifierInput; value: SetUserCollectionPermissionInput },
    context: AuthenticatedContext,
    info: any
) => {
    await context.connection.getCustomRepository(UserCollectionPermissionRepository).setUserCollectionPermission({
        identifier,
        value,
        relations: getGraphQlRelationName(info)
    });
};

export const deleteUserCollectionPermissions = async (
    _0: any,
    { identifier, username }: { identifier: CollectionIdentifierInput; username: string },
    context: AuthenticatedContext
) => {
    await context.connection.getCustomRepository(UserCollectionPermissionRepository).deleteUserCollectionPermissions({
        identifier,
        username
    });
};
