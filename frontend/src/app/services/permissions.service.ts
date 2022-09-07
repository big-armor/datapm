import { Injectable } from "@angular/core";
import { Permission } from "../../generated/graphql";

export function getEffectivePermissions(permission: Permission): Permission[] {
    const permissions = [Permission.VIEW, Permission.EDIT, Permission.MANAGE];
    const index = permissions.findIndex((p) => p === permission);
    return permissions.slice(0, index + 1);
}

export function getHighestPermission(permissions: Permission[]): Permission {
    const orderedPermissions = [Permission.MANAGE, Permission.EDIT, Permission.VIEW];

    for (const permission of orderedPermissions) {
        if (permissions.includes(permission)) {
            return permission;
        }
    }

    return Permission.NONE;

}

@Injectable({
    providedIn: "root"
})
export class PermissionsService {}
