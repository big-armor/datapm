import { AuthenticatedContext, Context } from "../context";
import { Permission, CollectionIdentifierInput, SetUserCollectionPermissionsInput } from "../generated/graphql";
import { UserCollectionPermissionRepository } from "../repository/UserCollectionPermissionRepository";
import { getGraphQlRelationName } from "../util/relationNames";
import { EntityManager } from "typeorm";
import { CollectionEntity } from "../entity/CollectionEntity";

export const hasCollectionPermissions = async (context: Context, collectionId: number, permission: Permission) => {
    const collection = await context.connection.getRepository(CollectionEntity).findOneOrFail(collectionId);

    if (permission == Permission.VIEW) {
        if (collection?.isPublic) return true;
    }

    if (context.me == null) {
        return false;
    }

    return context.connection
        .getCustomRepository(UserCollectionPermissionRepository)
        .hasPermission(context.me.id, collection.id, permission);
};

export const grantAllCollectionPermissionsForUser = async (
    transaction: EntityManager,
    userId: number,
    collectionId: number
) => {
    return transaction
        .getCustomRepository(UserCollectionPermissionRepository)
        .grantAllPermissionsForUser(userId, collectionId);
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
