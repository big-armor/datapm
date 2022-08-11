import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { MatSlideToggleChange } from "@angular/material/slide-toggle";
import { Router } from "@angular/router";
import { AuthenticationService } from "src/app/services/authentication.service";
import { getHighestPermission } from "src/app/services/permissions.service";
import { SnackBarService } from "src/app/services/snackBar.service";
import { DeleteCollectionComponent } from "src/app/shared/delete-collection/delete-collection.component";
import { EditCollectionComponent } from "src/app/shared/edit-collection/edit-collection.component";
import {
    Collection,
    Permission,
    SetUserCollectionPermissionsGQL,
    UpdateCollectionGQL,
    User,
    UsersByCollectionGQL
} from "src/generated/graphql";
import { AddUserComponent } from "../add-user/add-user.component";

@Component({
    selector: "app-collection-permissions",
    templateUrl: "./collection-permissions.component.html",
    styleUrls: ["./collection-permissions.component.scss"]
})
export class CollectionPermissionsComponent implements OnChanges {
    @Input() collection: Collection;
    @Output() collectionEdited: EventEmitter<Collection> = new EventEmitter();

    Permission = Permission;

    public columnsToDisplay = ["name", "permission", "actions"];
    public users: any[] = [];

    constructor(
        private dialog: MatDialog,
        private usersByCollection: UsersByCollectionGQL,
        private updateCollectionGQL: UpdateCollectionGQL,
        private setUserCollectionPermissionsGQL: SetUserCollectionPermissionsGQL,
        private authenticationService: AuthenticationService,
        private router: Router,
        private snackBarService: SnackBarService,
        private authSvc: AuthenticationService
    ) {}

    ngOnChanges(changes: SimpleChanges) {
        if (changes.collection && changes.collection.currentValue) {
            this.collection = changes.collection.currentValue;

            if (!this.collection.myPermissions.includes(Permission.MANAGE)) {
                this.columnsToDisplay = ["name", "permission"];
            }
            this.getUserList();
        }
    }

    private getUserList() {
        if (!this.collection) {
            return;
        }

        this.usersByCollection
            .fetch({
                identifier: {
                    collectionSlug: this.collection.identifier.collectionSlug
                }
            })
            .subscribe(({ data }) => {
                this.users = data.usersByCollection.map((item) => ({
                    username: item.user.username,
                    name: this.getUserName(item.user as User),
                    pendingInvitationAcceptance: item.user.username.includes("@"),
                    permission: getHighestPermission(item.permissions)
                }));
            });
    }

    public updatePublic(ev: MatSlideToggleChange) {
        this.updateCollectionGQL
            .mutate({
                identifier: {
                    collectionSlug: this.collection.identifier.collectionSlug
                },
                value: {
                    isPublic: ev.checked
                }
            })
            .subscribe(({ data }) => {
                this.collection.isPublic = (data.updateCollection as Collection).isPublic;
                this.collectionEdited.emit(this.collection);
            });
    }

    public editCollection() {
        this.dialog
            .open(EditCollectionComponent, {
                data: this.collection,
                disableClose: true
            })
            .afterClosed()
            .subscribe((collection: Collection) => {
                this.collection = collection;
                this.collectionEdited.emit(collection);
            });
    }

    public addUser() {
        const dialogRef = this.dialog.open(AddUserComponent, {
            width: "550px",
            data: this.collection
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (result) {
                this.getUserList();
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
        this.setUserCollectionPermissionsGQL
            .mutate({
                identifier: {
                    collectionSlug: this.collection?.identifier.collectionSlug
                },
                value: [
                    {
                        usernameOrEmailAddress: username,
                        permissions
                    }
                ],
                message: ""
            })
            .subscribe(({ errors }) => {
                if (errors) {
                    if (errors.find((e) => e.message.includes("CANNOT_SET_COLLECTION_CREATOR_PERMISSIONS")))
                        this.snackBarService.openSnackBar("Can not change the catalog creator permissions.", "Ok");
                    else this.snackBarService.openSnackBar("There was a problem. Try again later.", "Ok");
                }
                this.getUserList();
            });
    }

    private getPermissionArrayFrom(permission: Permission) {
        const permissions = [Permission.VIEW, Permission.EDIT, Permission.MANAGE];
        const index = permissions.findIndex((p) => p === permission);
        return permissions.slice(0, index + 1);
    }

    private getUserName(user: User) {
        const fullname = `${user.firstName || ""} ${user.lastName || ""}`.trim();
        return fullname ? `${fullname} (${user.username})` : user.username;
    }

    public deleteCollection() {
        const dlgRef = this.dialog.open(DeleteCollectionComponent, {
            data: {
                collectionSlug: this.collection.identifier.collectionSlug
            }
        });

        dlgRef.afterClosed().subscribe((confirmed: boolean) => {
            if (confirmed)
                this.router.navigate(["/" + this.authenticationService.currentUser.getValue().username], {
                    fragment: "collections"
                });
        });
    }

    public permissionString(permissions: Permission[]): string {
        if (permissions.includes(Permission.MANAGE)) return "Manage";

        if (permissions.includes(Permission.EDIT)) return "Edit";

        if (permissions.includes(Permission.VIEW)) return "View";

        return "";
    }
}
