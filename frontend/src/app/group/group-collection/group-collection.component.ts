import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { AddGroupCollectionPermissionsComponent } from "src/app/collection-details/add-group-collection-permissions/add-group-collection-permissions.component";
import { getHighestPermission } from "src/app/services/permissions.service";
import { SnackBarService } from "src/app/services/snackBar.service";
import {
    AddOrUpdateGroupToCollectionGQL,
    Group,
    Collection,
    Permission,
    RemoveGroupFromCollectionGQL
} from "src/generated/graphql";

@Component({
    selector: "app-group-collection",
    templateUrl: "./group-collection.component.html",
    styleUrls: ["./group-collection.component.scss"]
})
export class GroupCollectionsComponent implements OnChanges {
    @Input() group: Group;
    @Output() groupEdited: EventEmitter<Group> = new EventEmitter();

    getHighestPermission = getHighestPermission;

    Permission = Permission;

    public columnsToDisplay = ["name", "permission", "actions"];

    constructor(
        private dialog: MatDialog,
        private addorUpdateGroupToCollection: AddOrUpdateGroupToCollectionGQL,
        private removeGroupFromCollection: RemoveGroupFromCollectionGQL,
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

    public addCollection() {
        const dialogRef = this.dialog.open(AddGroupCollectionPermissionsComponent, {
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

    public updatePermission(collectionObject: Collection, permission: Permission) {
        this.setCollectionPermission(collectionObject, this.getPermissionArrayFrom(permission));
    }

    private setCollectionPermission(collectionObject: Collection, permissions: Permission[]) {
        this.addorUpdateGroupToCollection
            .mutate({
                groupSlug: this.group?.slug,
                permissions,
                collectionIdentifier: {
                    collectionSlug: collectionObject.identifier.collectionSlug
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

    public removeCollection(collectionObject: Collection): void {
        this.removeGroupFromCollection
            .mutate({
                groupSlug: this.group?.slug,
                collectionIdentifier: {
                    collectionSlug: collectionObject.identifier.collectionSlug
                }
            })
            .subscribe(({ errors }) => {
                if (errors) {
                    if (errors[0].message.includes("NOT_AUTHORIZED"))
                        this.snackBarService.openSnackBar("You are not authorized to manage this collection.", "Ok");
                    else this.snackBarService.openSnackBar("There was a problem. Try again later.", "Ok");
                }

                this.groupEdited.emit();
            });
    }
}
