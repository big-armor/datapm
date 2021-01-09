import { Component, OnInit } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { MatSlideToggleChange } from "@angular/material/slide-toggle";
import { ActivatedRoute, Router } from "@angular/router";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { AuthenticationService } from "src/app/services/authentication.service";
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

@Component({
    selector: "app-package-permission",
    templateUrl: "./package-permission.component.html",
    styleUrls: ["./package-permission.component.scss"]
})
export class PackagePermissionComponent implements OnInit {
    public package: Package;
    private unsubscribe$ = new Subject();
    public columnsToDisplay = ["name", "permission", "actions"];
    public users: any[] = [];

    constructor(
        private dialog: MatDialog,
        private usersByPackage: UsersByPackageGQL,
        private updatePackage: UpdatePackageGQL,
        private packageService: PackageService,
        private authSvc: AuthenticationService,
        private removeUserPackagePermission: RemovePackagePermissionsGQL,
        private setPackagePermissions: SetPackagePermissionsGQL,
        private router: Router,
        private route: ActivatedRoute
    ) {}

    ngOnInit(): void {
        this.packageService.package.pipe(takeUntil(this.unsubscribe$)).subscribe((p: PackageResponse) => {
            this.package = p?.package;
            if (this.canManage) {
                this.getUserList();
            } else {
                this.router.navigate([".."], { relativeTo: this.route });
            }
        });
    }

    private getUserList() {
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
                const currentUsername = this.authSvc.currentUser.value?.username;
                this.users = data.usersByPackage.map((item) => ({
                    username: item.user.username,
                    name: this.getUserName(item.user as User),
                    permission: this.findHighestPermission(item.permissions)
                }));
            });
    }

    public addUser() {
        const dialogRef = this.dialog.open(AddUserComponent, {
            data: {
                catalogSlug: this.package.identifier.catalogSlug,
                packageSlug: this.package.identifier.packageSlug
            }
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
        this.removeUserPackagePermission
            .mutate({
                identifier: {
                    catalogSlug: this.package.identifier.catalogSlug,
                    packageSlug: this.package.identifier.packageSlug
                },
                username
            })
            .subscribe(() => {
                this.getUserList();
            });
    }

    public get canManage() {
        return this.package?.myPermissions.includes(Permission.MANAGE);
    }

    private setUserPermission(username: string, permissions: Permission[]) {
        this.setPackagePermissions
            .mutate({
                identifier: {
                    catalogSlug: this.package.identifier.catalogSlug,
                    packageSlug: this.package.identifier.packageSlug
                },
                value: {
                    username,
                    permissions
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

    public updatePublic(ev: MatSlideToggleChange) {
        this.updatePackage
            .mutate({
                identifier: {
                    catalogSlug: this.package.identifier.catalogSlug,
                    packageSlug: this.package.identifier.packageSlug
                },
                value: {
                    isPublic: ev.checked
                }
            })
            .subscribe(({ errors, data }) => {
                this.package.isPublic = ev.checked;
            });
    }
}
