import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { getHighestPermission } from "src/app/services/permissions.service";
import { SnackBarService } from "src/app/services/snackBar.service";
import { EditGroupComponent } from "src/app/shared/edit-group/edit-group.component";
import { AddOrUpdateUserToGroupGQL, Group, Permission, UpdateGroupGQL, User } from "src/generated/graphql";
import { AddUserComponent } from "../add-user/add-user.component";

@Component({
    selector: "app-group-permissions",
    templateUrl: "./group-permissions.component.html",
    styleUrls: ["./group-permissions.component.scss"]
})
export class GroupPermissionsComponent implements OnChanges {
    @Input() group: Group;
    @Output() groupEdited: EventEmitter<Group> = new EventEmitter();

    Permission = Permission;

    public columnsToDisplay = ["name", "permission", "actions"];
    public users: any[] = [];

    constructor(
        private dialog: MatDialog,
        private addOrUpdateUserToGroupGQL: AddOrUpdateUserToGroupGQL,
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

    public editGroup() {
        this.dialog
            .open(EditGroupComponent, {
                data: this.group,
                disableClose: true
            })
            .afterClosed()
            .subscribe((group: Group) => {
                this.group = group;
                this.groupEdited.emit(group);
            });
    }

    public addUser() {
        const dialogRef = this.dialog.open(AddUserComponent, {
            width: "550px",
            data: this.group
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (result) {
                this.groupEdited.emit();
            }
        });
    }

    public updatePermission(username: string, permission: Permission) {
        this.setUserPermission(username, this.getPermissionArrayFrom(permission));
    }

    public removeUser(username: string) {
        this.setUserPermission(username, []);
    }

    private setUserPermission(username: string, permissions: Permission[]) {
        this.addOrUpdateUserToGroupGQL
            .mutate({
                groupSlug: this.group?.slug,
                userPermissions: [
                    {
                        permissions,
                        usernameOrEmailAddress: username
                    }
                ]
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

    public permissionString(permissions: Permission[]): string {
        if (permissions.includes(Permission.MANAGE)) return "Manage";

        if (permissions.includes(Permission.EDIT)) return "Edit";

        if (permissions.includes(Permission.VIEW)) return "View";

        return "";
    }
}
