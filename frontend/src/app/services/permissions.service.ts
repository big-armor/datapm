import { Injectable } from "@angular/core";
import { Permission } from "../../generated/graphql";

export function getEffectivePermissions(permission: Permission): Permission[] {
    const permissions = [Permission.VIEW, Permission.EDIT, Permission.MANAGE];
    const index = permissions.findIndex((p) => p === permission);
    return permissions.slice(0, index + 1);
}

@Injectable({
    providedIn: "root"
})
export class PermissionsService {}
