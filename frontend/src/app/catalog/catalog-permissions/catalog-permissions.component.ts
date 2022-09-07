import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { MatSlideToggleChange } from "@angular/material/slide-toggle";
import { ActivatedRoute, Router } from "@angular/router";
import { AuthenticationService } from "src/app/services/authentication.service";
import { SnackBarService } from "src/app/services/snackBar.service";
import { DeleteCatalogComponent } from "src/app/shared/delete-catalog/delete-catalog.component";
import { EditCatalogComponent } from "src/app/shared/edit-catalog/edit-catalog.component";
import {
    AddOrUpdateGroupToCatalogGQL,
    Catalog,
    CurrentUser,
    DeleteUserCatalogPermissionsGQL,
    Group,
    GroupCatalogPermission,
    GroupsByCatalogGQL,
    Permission,
    RemoveGroupFromCatalogGQL,
    SetUserCatalogPermissionGQL,
    UpdateCatalogGQL,
    User,
    UserCatalogPermissions,
    UsersByCatalogGQL
} from "src/generated/graphql";

import { AddUserComponent } from "../add-user/add-user.component";
import { DialogService } from "../../services/dialog/dialog.service";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { getEffectivePermissions, getHighestPermission } from "src/app/services/permissions.service";
import { AddGroupCatalogPermissionsComponent } from "src/app/group/add-group-catalog-permissions/add-group-catalog-permissions.component";

@Component({
    selector: "app-catalog-permissions",
    templateUrl: "./catalog-permissions.component.html",
    styleUrls: ["./catalog-permissions.component.scss"]
})
export class CatalogPermissionsComponent implements OnInit, OnChanges, OnDestroy {
    @Input() catalog: Catalog;

    public isCatalogPublic: boolean;
    public isCatalogUnclaimed: boolean;
    public columnsToDisplay = ["name", "permission", "packagePermission", "actions"];
    public users: (UserCatalogPermissions & { permission: Permission; packagePermission: Permission })[] = [];

    Permission = Permission;
    public currentUser: CurrentUser;
    public hasCatalogPublicErrors: boolean;
    public hasCatalogUnclaimedErrors: boolean;

    public groupPermissions: (GroupCatalogPermission & {
        permission: Permission;
        packagePermission: Permission;
    })[] = [];

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
        private snackBarService: SnackBarService,
        private route: ActivatedRoute,
        private addOrUpdateGroupToCatalogGQL: AddOrUpdateGroupToCatalogGQL,
        private remoteGroupCatalogPermissionsGQL: RemoveGroupFromCatalogGQL,
        private groupsByCatalogGQL: GroupsByCatalogGQL
    ) {}

    public ngOnInit(): void {
        this.authenticationService.currentUser.pipe(takeUntil(this.destroy)).subscribe((currentUser) => {
            this.currentUser = currentUser;
        });
    }

    public ngOnChanges(changes: SimpleChanges): void {
        if (changes.catalog && changes.catalog.currentValue) {
            if (!this.catalog.myPermissions.includes(Permission.MANAGE)) {
                this.columnsToDisplay = ["name", "permission"];
            }

            this.setCatalogVariables(changes.catalog.currentValue);
            this.getUserList();
            this.updateGroupsList();
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

    public removeUser(userPermissions: UserCatalogPermissions): void {
        this.deleteUserCatalogPermissionGQL
            .mutate({
                identifier: {
                    catalogSlug: this.catalog?.identifier.catalogSlug
                },
                usernameOrEmailAddress: userPermissions.user.username
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
                this.setCatalogVariables(newCatalog);
            });
    }

    public deleteCatalog(): void {
        const dlgRef = this.dialog.open(DeleteCatalogComponent, {
            data: {
                catalogSlug: this.catalog.identifier.catalogSlug
            }
        });

        dlgRef.afterClosed().subscribe((confirmed: boolean) => {
            if (confirmed) this.router.navigate([this.currentUser.user.username], { fragment: "catalogs" });
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
                    ...item,
                    permission: getHighestPermission(item.permissions),
                    packagePermission: getHighestPermission(item.packagePermissions)
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
                        packagePermissions: []
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

    public myCatalogPermission(permissions: Permission[]): string {
        if (permissions.includes(Permission.MANAGE)) return "Manage";

        if (permissions.includes(Permission.EDIT)) return "Edit";

        if (permissions.includes(Permission.VIEW)) return "View";

        return "";
    }

    public addGroup(): void {
        const dialogRef = this.dialog.open(AddGroupCatalogPermissionsComponent, {
            width: "550px",
            data: {
                catalog: this.catalog
            }
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (result) {
                this.updateGroupsList();
            }
        });
    }

    public removeGroup(group: Group): void {
        this.remoteGroupCatalogPermissionsGQL
            .mutate({
                catalogIdentifier: {
                    catalogSlug: this.catalog.identifier.catalogSlug
                },
                groupSlug: group.slug
            })
            .subscribe(({ errors }) => {
                if (errors) {
                    this.snackBarService.openSnackBar("There was a problem. Try again later.", "Ok");
                }
                this.updateGroupsList();
            });
    }

    public updateGroupPermissions(group: Group, permission: Permission, packagePermission: Permission): void {
        this.addOrUpdateGroupToCatalogGQL
            .mutate({
                groupSlug: group.slug,
                catalogIdentifier: {
                    catalogSlug: this.catalog.identifier.catalogSlug
                },
                permissions: getEffectivePermissions(permission),
                packagePermissions: getEffectivePermissions(packagePermission)
            })
            .subscribe(({ errors }) => {
                this.snackBarService.openSnackBar(
                    errors
                        ? "There was a problem. Try again later."
                        : "Group '" + group.name + "' permissions updated to " + permission,
                    "Ok"
                );
                this.updateGroupsList();
            });
    }

    private updateGroupsList(): void {
        if (!this.catalog) {
            return;
        }

        this.groupsByCatalogGQL
            .fetch({
                catalogIdentifier: {
                    catalogSlug: this.catalog.identifier.catalogSlug
                }
            })
            .subscribe(({ data }) => {
                this.groupPermissions = data.groupsByCatalog
                    .map((item) => ({
                        ...item,
                        permission: getHighestPermission(item.permissions),
                        packagePermission: getHighestPermission(item.packagePermissions)
                    }))
                    .sort((a, b) => a.group.name.localeCompare(b.group.name));
            });
    }
}
