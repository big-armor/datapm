import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { getHighestPermission } from "src/app/services/permissions.service";
import { SnackBarService } from "src/app/services/snackBar.service";
import {
    AddOrUpdateGroupToCatalogGQL,
    Group,
    Catalog,
    Permission,
    RemoveGroupFromCatalogGQL
} from "src/generated/graphql";
import { AddGroupCatalogPermissionsComponent } from "../add-group-catalog-permissions/add-group-catalog-permissions.component";

@Component({
    selector: "app-group-catalog",
    templateUrl: "./group-catalog.component.html",
    styleUrls: ["./group-catalog.component.scss"]
})
export class GroupCatalogsComponent implements OnChanges {
    @Input() group: Group;
    @Output() groupEdited: EventEmitter<Group> = new EventEmitter();

    getHighestPermission = getHighestPermission;

    Permission = Permission;

    public columnsToDisplay = ["name", "permission", "packagePermission", "actions"];
    public users: any[] = [];

    constructor(
        private dialog: MatDialog,
        private addorUpdateGroupToCatalog: AddOrUpdateGroupToCatalogGQL,
        private removeGroupFromCatalog: RemoveGroupFromCatalogGQL,
        private snackBarService: SnackBarService
    ) {}

    ngOnChanges(changes: SimpleChanges) {
        if (changes.group && changes.group.currentValue) {
            this.group = changes.group.currentValue;

            if (!this.group.myPermissions.includes(Permission.MANAGE)) {
                this.columnsToDisplay = ["name", "permission", "packagePermission"];
            }

            this.group.users?.forEach((groupUser: any) => {
                groupUser.permission = getHighestPermission(groupUser.permissions);
            });
        }
    }

    public addCatalog() {
        const dialogRef = this.dialog.open(AddGroupCatalogPermissionsComponent, {
            width: "550px",
            data: {
                group: this.group
            }
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (result) {
                this.groupEdited.emit();
            }
        });
    }

    public updatePermission(catalogObject: Catalog, permission: Permission, packagePermission: Permission) {
        this.setCatalogPermission(
            catalogObject,
            this.getPermissionArrayFrom(permission),
            this.getPermissionArrayFrom(packagePermission)
        );
    }

    private setCatalogPermission(catalogObject: Catalog, permissions: Permission[], packagePermissions: Permission[]) {
        this.addorUpdateGroupToCatalog
            .mutate({
                groupSlug: this.group?.slug,
                permissions,
                packagePermissions,
                catalogIdentifier: {
                    catalogSlug: catalogObject.identifier.catalogSlug
                }
            })
            .subscribe(({ errors }) => {
                if (errors) {
                    if (errors.find((e) => e.message.includes("CANNOT_SET_GROUP_CREATOR_PERMISSIONS")))
                        this.snackBarService.openSnackBar("Can not change the group creator permissions.", "Ok");
                    else this.snackBarService.openSnackBar("There was a problem. Try again later.", "Ok");
                }

                this.groupEdited.emit();
            });
    }

    private getPermissionArrayFrom(permission: Permission) {
        const permissions = [Permission.VIEW, Permission.EDIT, Permission.MANAGE];
        const index = permissions.findIndex((p) => p === permission);
        return permissions.slice(0, index + 1);
    }

    public highestPermission(permissions: Permission[]): Permission {
        if (permissions.includes(Permission.MANAGE)) return Permission.MANAGE;

        if (permissions.includes(Permission.EDIT)) return Permission.EDIT;

        if (permissions.includes(Permission.VIEW)) return Permission.VIEW;

        return Permission.NONE;
    }

    public permissionString(permissions: Permission[]): string {
        if (permissions.includes(Permission.MANAGE)) return "Manage";

        if (permissions.includes(Permission.EDIT)) return "Edit";

        if (permissions.includes(Permission.VIEW)) return "View";

        return "";
    }

    public removeCatalog(catalogObject: Catalog): void {
        this.removeGroupFromCatalog
            .mutate({
                groupSlug: this.group?.slug,
                catalogIdentifier: {
                    catalogSlug: catalogObject.identifier.catalogSlug
                }
            })
            .subscribe(({ errors }) => {
                if (errors) {
                    if (errors[0].message.includes("NOT_AUTHORIZED"))
                        this.snackBarService.openSnackBar("You are not authorized to manage this catalog.", "Ok");
                    else this.snackBarService.openSnackBar("There was a problem. Try again later.", "Ok");
                }

                this.groupEdited.emit();
            });
    }
}
