import { Component, Inject, OnInit, ViewChild } from "@angular/core";
import { FormGroup, FormControl } from "@angular/forms";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { PageState } from "src/app/models/page-state";
import { getEffectivePermissions } from "src/app/services/permissions.service";
import { ChipData } from "src/app/shared/user-invite-input/chip-data";
import { ChipState } from "src/app/shared/user-invite-input/chip-state";
import { UserInviteInputComponent } from "src/app/shared/user-invite-input/user-invite-input.component";
import { Catalog, Permission, SetUserCatalogPermissionGQL, SetUserCatalogPermissionInput } from "src/generated/graphql";

enum ErrorType {
    USER_NOT_FOUND = "USER_NOT_FOUND",
    CANNOT_SET_CATALOG_CREATOR_PERMISSIONS = "CANNOT_SET_CATALOG_CREATOR_PERMISSIONS"
}
@Component({
    selector: "app-add-user",
    templateUrl: "./add-user.component.html",
    styleUrls: ["./add-user.component.scss"]
})
export class AddUserComponent implements OnInit {
    @ViewChild("userInviteInput")
    public userInviteInput: UserInviteInputComponent;

    public form: FormGroup;
    public state: PageState = "INIT";
    public error: ErrorType | string = null;

    public usernameControl: FormControl = new FormControl("");
    public messageControl: FormControl = new FormControl("");

    public permission: Permission;
    public packagesPermission: Permission;

    public usersChips: ChipData[] = [];
    public loading: boolean;

    public hasErrors = false;

    private effectivePermissions: Permission[];
    private packagesEffectivePermissions: Permission[];

    constructor(
        @Inject(MAT_DIALOG_DATA) public catalog: Catalog,
        private setUserCatalogPermissionGQL: SetUserCatalogPermissionGQL,
        private dialogRef: MatDialogRef<AddUserComponent>
    ) {
        this.updateSelectedPermission(Permission.VIEW);
        this.updatePackagesPermissions(Permission.VIEW);
    }

    public ngOnInit(): void {
        this.form = new FormGroup({
            username: this.usernameControl,
            message: this.messageControl
        });
    }

    public submit(event: any): void {
        event.preventDefault();
        this.userInviteInput.addFromInputControlValue();

        if (!this.hasErrors) {
            this.submitForm();
        }
    }

    public updateSelectedPermission(permission: Permission): void {
        this.permission = permission;
        this.effectivePermissions = getEffectivePermissions(permission);
    }

    public updatePackagesPermissions(permission: Permission): void {
        this.packagesPermission = permission;
        this.packagesEffectivePermissions = getEffectivePermissions(permission);
    }

    public onUserInputChange(value: ChipData[]): void {
        this.usersChips = value;
        this.hasErrors = this.hasErrorsInAddedUsers();
    }

    public onLoadingStatusChange(value: boolean): void {
        this.loading = value;
    }

    private submitForm(): void {
        this.state = "LOADING";
        this.loading = true;
        this.setUserCatalogPermissionGQL
            .mutate({
                identifier: {
                    catalogSlug: this.catalog.identifier.catalogSlug
                },
                value: this.buildPermissionsArray(),
                message: this.messageControl.value
            })
            .subscribe(
                ({ errors }) => {
                    if (errors) {
                        this.state = "ERROR";

                        const firstErrorMessage = errors[0].message;
                        if (firstErrorMessage.includes("USER_NOT_FOUND")) {
                            this.error = ErrorType.USER_NOT_FOUND;
                        } else if (firstErrorMessage.includes("CANNOT_SET_CATALOG_CREATOR_PERMISSIONS")) {
                            this.error = ErrorType.CANNOT_SET_CATALOG_CREATOR_PERMISSIONS;
                        } else {
                            this.error = firstErrorMessage;
                        }

                        this.loading = false;
                        return;
                    }
                    this.loading = false;
                    this.dialogRef.close("SUCCESS");
                },
                () => {
                    this.state = "ERROR";
                    this.loading = false;
                }
            );
    }

    private hasErrorsInAddedUsers(): boolean {
        return this.usersChips.some((c) => ChipState.ERROR === c.state);
    }

    private buildPermissionsArray(): SetUserCatalogPermissionInput[] {
        return this.usersChips.map((c) => {
            return {
                usernameOrEmailAddress: c.usernameOrEmailAddress,
                permission: this.effectivePermissions,
                packagePermissions: this.packagesEffectivePermissions
            };
        });
    }
}
