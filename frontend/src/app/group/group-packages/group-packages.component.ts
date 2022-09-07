import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { getHighestPermission } from "src/app/services/permissions.service";
import { SnackBarService } from "src/app/services/snackBar.service";
import { EditGroupComponent } from "src/app/shared/edit-group/edit-group.component";
import {
    AddOrUpdateGroupToPackageGQL,
    Group,
    Package,
    Permission,
    RemoveGroupFromPackageGQL
} from "src/generated/graphql";
import { AddGroupPackagePermissionsComponent } from "../add-group-package-permissions/add-group-package-permissions.component";

@Component({
    selector: "app-group-packages",
    templateUrl: "./group-packages.component.html",
    styleUrls: ["./group-packages.component.scss"]
})
export class GroupPackagesComponent implements OnChanges {
    @Input() group: Group;
    @Output() groupEdited: EventEmitter<Group> = new EventEmitter();

    Permission = Permission;

    public columnsToDisplay = ["name", "permission", "actions"];
    public users: any[] = [];

    constructor(
        private dialog: MatDialog,
        private addorUpdateGroupToPackage: AddOrUpdateGroupToPackageGQL,
        private removeGroupFromPackage: RemoveGroupFromPackageGQL,
        private snackBarService: SnackBarService
    ) {}

    ngOnChanges(changes: SimpleChanges) {
        if (changes.group && changes.group.currentValue) {
            this.group = changes.group.currentValue;

            if (!this.group.myPermissions.includes(Permission.MANAGE)) {
                this.columnsToDisplay = ["name", "permission"];
            }

            this.group.users?.forEach((groupUser: any) => {
                groupUser.permission = getHighestPermission(groupUser.permissions);
            });
        }
    }

    public addPackage() {
        const dialogRef = this.dialog.open(AddGroupPackagePermissionsComponent, {
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

    public updatePermission(packageObject: Package, permission: Permission) {
        this.setPackagePermission(packageObject, this.getPermissionArrayFrom(permission));
    }

    private setPackagePermission(packageObject: Package, permissions: Permission[]) {
        this.addorUpdateGroupToPackage
            .mutate({
                groupSlug: this.group?.slug,
                permissions,
                packageIdentifier: {
                    catalogSlug: packageObject.identifier.catalogSlug,
                    packageSlug: packageObject.identifier.packageSlug
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

        return Permission.VIEW;
    }

    public permissionString(permissions: Permission[]): string {
        if (permissions.includes(Permission.MANAGE)) return "Manage";

        if (permissions.includes(Permission.EDIT)) return "Edit";

        if (permissions.includes(Permission.VIEW)) return "View";

        return "";
    }

    public removePackage(packageObject: Package): void {
        this.removeGroupFromPackage
            .mutate({
                groupSlug: this.group?.slug,
                packageIdentifier: {
                    catalogSlug: packageObject.identifier.catalogSlug,
                    packageSlug: packageObject.identifier.packageSlug
                }
            })
            .subscribe(({ errors }) => {
                if (errors) {
                    if (errors[0].message.includes("NOT_AUTHORIZED"))
                        this.snackBarService.openSnackBar("You are not authorized to manage this package.", "Ok");
                    else this.snackBarService.openSnackBar("There was a problem. Try again later.", "Ok");
                }

                this.groupEdited.emit();
            });
    }
}
