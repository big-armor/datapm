import { Component, Input, OnInit, SimpleChanges } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { MatSlideToggleChange } from "@angular/material/slide-toggle";
import { AuthenticationService } from "src/app/services/authentication.service";
import { EditCatalogComponent } from "src/app/shared/edit-catalog/edit-catalog.component";
import {
    Catalog,
    Permission,
    SetUserCatalogPermissionGQL,
    UpdateCatalogGQL,
    User,
    UsersByCatalogGQL
} from "src/generated/graphql";

import { AddUserComponent } from "../add-user/add-user.component";

@Component({
    selector: "app-catalog-permissions",
    templateUrl: "./catalog-permissions.component.html",
    styleUrls: ["./catalog-permissions.component.scss"]
})
export class CatalogPermissionsComponent implements OnInit {
    @Input() catalog: Catalog;

    public columnsToDisplay = ["name", "permission", "actions"];
    public users: any[] = [];

    constructor(
        private dialog: MatDialog,
        private usersByCatalogGQL: UsersByCatalogGQL,
        private updateCatalogGQL: UpdateCatalogGQL,
        private setUserCatalogPermissionGQL: SetUserCatalogPermissionGQL,
        private authSvc: AuthenticationService
    ) {}

    ngOnInit(): void {}

    ngOnChanges(changes: SimpleChanges) {
        if (changes.catalog && changes.catalog.currentValue) {
            this.catalog = changes.catalog.currentValue;
            console.log(changes.catalog.currentValue);
            this.getUserList();
        }
    }

    private getUserList() {
        if (!this.catalog) {
            return;
        }

        this.usersByCatalogGQL
            .watch({
                identifier: {
                    catalogSlug: this.catalog.identifier.catalogSlug
                }
            })
            .valueChanges.subscribe(({ data }) => {
                const currentUsername = this.authSvc.currentUser.value?.username;
                this.users = data.usersByCatalog
                    .filter((item) => !currentUsername || item.user.username !== currentUsername)
                    .map((item) => ({
                        username: item.user.username,
                        name: this.getUserName(item.user as User),
                        permission: this.findHighestPermission(item.permissions)
                    }));
            });
    }

    public updatePublic(ev: MatSlideToggleChange) {
        this.updateCatalogGQL
            .mutate({
                identifier: {
                    catalogSlug: this.catalog.identifier.catalogSlug
                },
                value: {
                    isPublic: ev.checked
                }
            })
            .subscribe(({ data }) => {
                this.catalog = data.updateCatalog as Catalog;
            });
    }

    public addUser() {
        const dialogRef = this.dialog.open(AddUserComponent, {
            data: this.catalog?.identifier.catalogSlug
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
        this.setUserCatalogPermissionGQL
            .mutate({
                identifier: {
                    catalogSlug: this.catalog?.identifier.catalogSlug
                },
                value: {
                    username,
                    permission: permissions,
                    packagePermission: []
                }
            })
            .subscribe(() => {
                if (!permissions.length) {
                    this.getUserList();
                }
            });
    }

    private findHighestPermission(userPermssions: Permission[]) {
        const permissions = [Permission.MANAGE, Permission.EDIT, Permission.VIEW];
        for (let i = 0; i < permissions.length; i++) {
            if (userPermssions.includes(permissions[i])) {
                return permissions[i];
            }
        }

        return Permission.NONE;
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

    public editCatalog() {
        this.dialog
            .open(EditCatalogComponent, {
                data: this.catalog
            })
            .afterClosed()
            .subscribe((newCatalog: Catalog) => {
                this.getUserList();
            });
    }
}
