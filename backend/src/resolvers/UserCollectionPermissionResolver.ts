import { AuthenticatedContext } from "../context";
import { Permission } from "../generated/graphql";
import { UserCollectionPermissionRepository } from "../repository/UserCollectionPermissionRepository";

export const hasCollectionPermissions = async (context: AuthenticatedContext, collectionId: number, permission: Permission) => {
  return context.connection.getCustomRepository(UserCollectionPermissionRepository)
    .hasPermission(context.me.id, collectionId, permission);
}

export const grantAllCollectionPermissionsForUser = async (context: AuthenticatedContext, collectionId: number) => {
  return context.connection.getCustomRepository(UserCollectionPermissionRepository)
    .grantAllPermissionsForUser(context.me.id, collectionId);
}

export const setPermissionsForUser = async (context: AuthenticatedContext, collectionId: number, permissions: Permission[]) => {
  return context.connection.getCustomRepository(UserCollectionPermissionRepository)
    .setPermissionsForUser(context.me.id, collectionId, permissions);
}