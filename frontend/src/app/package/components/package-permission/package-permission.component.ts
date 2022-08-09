import { Component, OnInit } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { MatSlideToggleChange } from "@angular/material/slide-toggle";
import { ActivatedRoute, Router } from "@angular/router";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { AuthenticationService } from "src/app/services/authentication.service";
import { SnackBarService } from "src/app/services/snackBar.service";
import { DeletePackageComponent } from "src/app/shared/delete-package/delete-package.component";
import {
    Package,
    Permission,
    RemovePackagePermissionsGQL,
    SetPackagePermissionsGQL,
    UpdatePackageGQL,
    User,
    UsersByPackageGQL
} from "src/generated/graphql";
import { PackageResponse, PackageService } from "../../services/package.service";
import { AddUserComponent } from "../add-user/add-user.component";
import { DialogService } from "../../../services/dialog/dialog.service";
import { getEffectivePermissions } from "../../../services/permissions.service";
import { MovePackageComponent, MovePackageDialogData } from "src/app/shared/move-package/move-package.component";

@Component({
    selector: "app-package-permission",
    templateUrl: "./package-permission.component.html",
    styleUrls: ["./package-permission.component.scss"]
})
export class PackagePermissionComponent implements OnInit {
    public package: Package;
    public columnsToDisplay = ["name", "permission", "actions"];
    public users: any[] = [];
    public groups: any[] = [];

    private unsubscribe$ = new Subject();

    constructor(
        private dialog: MatDialog,
        private usersByPackage: UsersByPackageGQL,
        private updatePackage: UpdatePackageGQL,
        private packageService: PackageService,
        private removeUserPackagePermission: RemovePackagePermissionsGQL,
        private setPackagePermissions: SetPackagePermissionsGQL,
        private router: Router,
        private snackBarService: SnackBarService,
        private route: ActivatedRoute,
        private authenticationService: AuthenticationService,
        private dialogService: DialogService
    ) {}

    public ngOnInit(): void {
        this.packageService.package.pipe(takeUntil(this.unsubscribe$)).subscribe((p: PackageResponse) => {
            this.package = p?.package;
            if (this.canManage) {
                this.getUserList();
            } else {
                this.router.navigate([".."], { relativeTo: this.route });
            }
        });
    }

    public addUser(): void {
        const dialogRef = this.dialog.open(AddUserComponent, {
            width: "550px",
            data: this.package
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (result) {
                this.getUserList();
            }
        });
    }

    public updatePermission(username: string, permission: Permission): void {
        this.setUserPermission(username, getEffectivePermissions(permission));
    }

    public removeUser(usernameOrEmailAddress: string): void {
        this.removeUserPackagePermission
            .mutate({
                identifier: {
                    catalogSlug: this.package.identifier.catalogSlug,
                    packageSlug: this.package.identifier.packageSlug
                },
                usernameOrEmailAddress
            })
            .subscribe(({ errors }) => {
                if (errors) {
                    if (errors.find((e) => e.message.includes("CANNOT_REMOVE_CREATOR_PERMISSIONS")))
                        this.snackBarService.openSnackBar("Can not change the package creator permissions.", "Ok");
                    else this.snackBarService.openSnackBar("There was a problem. Try again later.", "Ok");
                }
                this.getUserList();
            });
    }

    public get canManage(): boolean {
        return this.package?.myPermissions.includes(Permission.MANAGE);
    }

    public updatePublic(changeEvent: MatSlideToggleChange): void {
        if (!this.canEditVisibility) {
            return;
        }

        this.updatePackageVisibility(changeEvent);
    }

    public get canEditVisibility(): boolean {
        if (!this.package || !this.package.catalog) {
            return false;
        }

        return this.package.catalog.isPublic;
    }

    public deletePackage(): void {
        const dlgRef = this.dialog.open(DeletePackageComponent, {
            data: {
                catalogSlug: this.package.identifier.catalogSlug,
                packageSlug: this.package.identifier.packageSlug
            }
        });

        dlgRef.afterClosed().subscribe((confirmed: boolean) => {
            if (confirmed)
                this.router.navigate(["/" + this.authenticationService.currentUser.getValue().username], {
                    fragment: "packages"
                });
        });
    }

    public movePackage(): void {
        this.dialog.open(MovePackageComponent, {
            width: "550px",
            disableClose: true,
            data: {
                packageObject: this.package,
                hasOtherUsers: this.users.length > 1
            } as MovePackageDialogData
        });
    }

    private getUserList(): void {
        if (!this.package) {
            return;
        }

        this.usersByPackage
            .fetch({
                identifier: {
                    catalogSlug: this.package.identifier.catalogSlug,
                    packageSlug: this.package.identifier.packageSlug
                }
            })
            .subscribe(({ data }) => {
                this.users = data.usersByPackage.map((item) => ({
                    username: item.user.username,
                    name: this.getUserName(item.user as User),
                    pendingInvitationAcceptance: item.user.username.includes("@"),
                    permission: this.findHighestPermission(item.permissions)
                }));
            });
    }

    private setUserPermission(username: string, permissions: Permission[]): void {
        this.setPackagePermissions
            .mutate({
                identifier: {
                    catalogSlug: this.package.identifier.catalogSlug,
                    packageSlug: this.package.identifier.packageSlug
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
                    if (errors.find((e) => e.message.includes("CANNOT_SET_PACKAGE_CREATOR_PERMISSIONS")))
                        this.snackBarService.openSnackBar("Can not change the package creator permissions.", "Ok");
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

    private getUserName(user: User): string {
        const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
        return fullName ? `${fullName} (${user.username})` : user.username;
    }

    private updatePackageVisibility(changeEvent: MatSlideToggleChange): void {
        this.dialogService
            .openPackageVisibilityChangeConfirmationDialog(changeEvent.checked)
            .subscribe((confirmation) => {
                if (!confirmation) {
                    changeEvent.source.writeValue(!changeEvent.checked);
                    return;
                }

                this.updatePackage
                    .mutate({
                        identifier: {
                            catalogSlug: this.package.identifier.catalogSlug,
                            packageSlug: this.package.identifier.packageSlug
                        },
                        value: {
                            isPublic: changeEvent.checked
                        }
                    })
                    .subscribe(({ errors, data }) => (this.package.isPublic = changeEvent.checked));
            });
    }
}
