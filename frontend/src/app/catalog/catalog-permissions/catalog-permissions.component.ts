import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { MatSlideToggleChange } from "@angular/material/slide-toggle";
import { Router } from "@angular/router";
import { AuthenticationService } from "src/app/services/authentication.service";
import { SnackBarService } from "src/app/services/snackBar.service";
import { DeleteCatalogComponent } from "src/app/shared/delete-catalog/delete-catalog.component";
import { EditCatalogComponent } from "src/app/shared/edit-catalog/edit-catalog.component";
import {
    Catalog,
    DeleteUserCatalogPermissionsGQL,
    Permission,
    SetUserCatalogPermissionGQL,
    UpdateCatalogGQL,
    User,
    UsersByCatalogGQL
} from "src/generated/graphql";

import { AddUserComponent } from "../add-user/add-user.component";
import { DialogService } from "../../services/dialog/dialog.service";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";

@Component({
    selector: "app-catalog-permissions",
    templateUrl: "./catalog-permissions.component.html",
    styleUrls: ["./catalog-permissions.component.scss"]
})
export class CatalogPermissionsComponent implements OnInit, OnChanges, OnDestroy {
    @Input() catalog: Catalog;

    public isCatalogPublic: boolean;
    public isCatalogUnclaimed: boolean;
    public columnsToDisplay = ["name", "permission", "actions"];
    public users: any[] = [];

    public user: User;
    public hasCatalogPublicErrors: boolean;
    public hasCatalogUnclaimedErrors: boolean;

    @Output()
    public onCatalogUpdate = new EventEmitter<Catalog>();

    public destroy = new Subject();

    constructor(
        private dialog: MatDialog,
        private dialogService: DialogService,
        private authenticationService: AuthenticationService,
        private router: Router,
        private usersByCatalogGQL: UsersByCatalogGQL,
        private updateCatalogGQL: UpdateCatalogGQL,
        private setUserCatalogPermissionGQL: SetUserCatalogPermissionGQL,
        private deleteUserCatalogPermissionGQL: DeleteUserCatalogPermissionsGQL,
        private snackBarService: SnackBarService
    ) {}

    public ngOnInit(): void {
        this.authenticationService.currentUser.pipe(takeUntil(this.destroy)).subscribe((user) => {
            this.user = user;
        });
    }

    public ngOnChanges(changes: SimpleChanges): void {
        if (changes.catalog && changes.catalog.currentValue) {
            this.setCatalogVariables(changes.catalog.currentValue);
            this.getUserList();
        }
    }

    public ngOnDestroy(): void {
        this.destroy.next();
        this.destroy.complete();
    }

    public updatePublic(ev: MatSlideToggleChange): void {
        this.isCatalogPublic = ev.checked;
        this.openPackageVisibilityChangeDialog(ev.checked);
    }

    public updateUnclaimed(ev: MatSlideToggleChange): void {
        this.isCatalogUnclaimed = ev.checked;
        this.openPackageUnclaimedStatusDialog(ev.checked);
    }

    public addUser(): void {
        const dialogRef = this.dialog.open(AddUserComponent, {
            width: "550px",
            data: this.catalog
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (result) {
                this.getUserList();
            }
        });
    }

    public updatePermission(username: string, permission: Permission): void {
        this.setUserPermission(username, this.getPermissionArrayFrom(permission));
    }

    public removeUser(username: string): void {
        this.deleteUserCatalogPermissionGQL
            .mutate({
                identifier: {
                    catalogSlug: this.catalog?.identifier.catalogSlug
                },
                usernameOrEmailAddress: username
            })
            .subscribe(({ errors }) => {
                if (errors) {
                    if (errors.find((e) => e.message.includes("CANNOT_REMOVE_CREATOR_PERMISSIONS")))
                        this.snackBarService.openSnackBar("Can not remove the catalog creator.", "Ok");
                    else this.snackBarService.openSnackBar("There was a problem. Try again later.", "Ok");
                }
                this.getUserList();
            });
    }

    public editCatalog(): void {
        this.dialog
            .open(EditCatalogComponent, {
                data: this.catalog,
                disableClose: true
            })
            .afterClosed()
            .subscribe((newCatalog: Catalog) => {
                this.catalog = newCatalog;
            });
    }

    public deleteCatalog(): void {
        const dlgRef = this.dialog.open(DeleteCatalogComponent, {
            data: {
                catalogSlug: this.catalog.identifier.catalogSlug
            }
        });

        dlgRef.afterClosed().subscribe((confirmed: boolean) => {
            if (confirmed) this.router.navigate(["/" + this.user.username + "#catalogs"]);
        });
    }

    private getUserList(): void {
        if (!this.catalog) {
            return;
        }

        this.usersByCatalogGQL
            .fetch({
                identifier: {
                    catalogSlug: this.catalog.identifier.catalogSlug
                }
            })
            .subscribe(({ data }) => {
                this.users = data.usersByCatalog.map((item) => ({
                    username: item.user.username,
                    name: this.getUserName(item.user as User),
                    pendingInvitationAcceptance: item.user.username.includes("@"),
                    permission: this.findHighestPermission(item.permissions)
                }));
            });
    }

    private setUserPermission(username: string, permissions: Permission[]): void {
        this.setUserCatalogPermissionGQL
            .mutate({
                identifier: {
                    catalogSlug: this.catalog?.identifier.catalogSlug
                },
                value: [
                    {
                        usernameOrEmailAddress: username,
                        permission: permissions,
                        packagePermission: []
                    }
                ],
                message: ""
            })
            .subscribe(({ errors }) => {
                if (errors) {
                    if (errors.find((e) => e.message.includes("CANNOT_CHANGE_CATALOG_CREATOR_PERMISSIONS")))
                        this.snackBarService.openSnackBar("Can not change the catalog creator permissions.", "Ok");
                    else this.snackBarService.openSnackBar("There was a problem. Try again later.", "Ok");
                }
                this.getUserList();
            });
    }

    private findHighestPermission(userPermissions: Permission[]): Permission {
        const permissions = [Permission.MANAGE, Permission.EDIT, Permission.VIEW];

        for (const permission of permissions) {
            if (userPermissions.includes(permission)) {
                return permission;
            }
        }

        return Permission.NONE;
    }

    private getPermissionArrayFrom(permission: Permission): Permission[] {
        const permissions = [Permission.VIEW, Permission.EDIT, Permission.MANAGE];
        const index = permissions.findIndex((p) => p === permission);
        return permissions.slice(0, index + 1);
    }

    private getUserName(user: User): string {
        const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
        return fullName ? `${fullName} (${user.username})` : user.username;
    }

    private openPackageVisibilityChangeDialog(isPublic: boolean): void {
        this.dialogService.openCatalogVisibilityChangeConfirmationDialog(isPublic).subscribe((confirmed) => {
            if (confirmed) {
                this.updateCatalogVisibility(isPublic);
            } else {
                this.isCatalogPublic = !isPublic;
            }
        });
    }

    private openPackageUnclaimedStatusDialog(unclaimed: boolean): void {
        this.dialogService.openCatalogUnclaimedStatusConfirmationDialog(unclaimed).subscribe((confirmed) => {
            if (confirmed) {
                this.updateCatalogUnclaimed(unclaimed);
            } else {
                this.isCatalogUnclaimed = !unclaimed;
            }
        });
    }

    private updateCatalogVisibility(isPublic: boolean): void {
        this.hasCatalogPublicErrors = false;
        this.updateCatalogGQL
            .mutate({
                identifier: {
                    catalogSlug: this.catalog.identifier.catalogSlug
                },
                value: {
                    isPublic
                }
            })
            .subscribe(
                ({ data, errors }) => {
                    if (errors) {
                        this.hasCatalogPublicErrors = true;
                    } else {
                        this.setCatalogVariables(data.updateCatalog as Catalog);
                    }
                },
                (errors) => {
                    this.hasCatalogPublicErrors = true;
                }
            );
    }

    private updateCatalogUnclaimed(unclaimed: boolean): void {
        this.hasCatalogUnclaimedErrors = false;
        this.updateCatalogGQL
            .mutate({
                identifier: {
                    catalogSlug: this.catalog.identifier.catalogSlug
                },
                value: {
                    unclaimed
                }
            })
            .subscribe(
                ({ data, errors }) => {
                    if (errors) {
                        this.hasCatalogUnclaimedErrors = true;
                    } else {
                        this.setCatalogVariables(data.updateCatalog as Catalog);
                    }
                },
                (errors) => {
                    this.hasCatalogUnclaimedErrors = true;
                }
            );
    }

    private setCatalogVariables(catalog: Catalog): void {
        this.catalog = catalog;
        this.isCatalogPublic = catalog.isPublic;
        this.isCatalogUnclaimed = catalog.unclaimed;
        this.onCatalogUpdate.emit(catalog);
    }
}
