import { AuthenticatedContext } from "../context";
import { Permission, CollectionIdentifierInput, SetUserCollectionPermissionsInput } from "../generated/graphql";
import { CollectionRepository } from "../repository/CollectionRepository";
import { UserCollectionPermissionRepository } from "../repository/UserCollectionPermissionRepository";
import { getGraphQlRelationName } from "../util/relationNames";

export const hasCollectionPermissions = async (
    context: AuthenticatedContext,
    collectionId: number,
    permission: Permission
) => {
    if (permission == Permission.VIEW) {
        const collection = await context.connection
            .getCustomRepository(CollectionRepository)
            .findOne({ id: collectionId });

        if (collection?.isPublic) return true;
    }

    if (context.me == null) {
        return false;
    }

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

export const setUserCollectionPermissions = async (
    _0: any,
    { identifier, value }: { identifier: CollectionIdentifierInput; value: SetUserCollectionPermissionsInput },
    context: AuthenticatedContext,
    info: any
) => {
    await context.connection.getCustomRepository(UserCollectionPermissionRepository).setUserCollectionPermissions({
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
    return context.connection.getCustomRepository(UserCollectionPermissionRepository).deleteUserCollectionPermissions({
        identifier,
        username
    });
};
