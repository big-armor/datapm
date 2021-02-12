import { Component, Inject, OnInit } from "@angular/core";
import { FormGroup, FormControl } from "@angular/forms";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { PageState } from "src/app/models/page-state";
import { Package, Permission, SetPackagePermissionInput, SetPackagePermissionsGQL } from "src/generated/graphql";
import { getEffectivePermissions } from "src/app/services/permissions.service";
import { ChipData } from "src/app/shared/user-invite-input/chip-data";
import { ChipState } from "src/app/shared/user-invite-input/chip-state";

enum ErrorType {
    USER_NOT_FOUND = "USER_NOT_FOUND",
    CANNOT_SET_PACKAGE_CREATOR_PERMISSIONS = "CANNOT_SET_PACKAGE_CREATOR_PERMISSIONS",
    INVALID_EMAIL_ADDRESS = "INVALID_EMAIL_ADDRESS"
}

@Component({
    selector: "app-add-user",
    templateUrl: "./add-user.component.html",
    styleUrls: ["./add-user.component.scss"]
})
export class AddUserComponent implements OnInit {
    public form: FormGroup;
    public state: PageState = "INIT";
    public error: ErrorType | string = null;

    public usernameControl: FormControl = new FormControl("");
    public messageControl: FormControl = new FormControl("");

    public permission: Permission;

    public usersChips: ChipData[] = [];
    public loading: boolean;

    public hasErrors = false;

    private effectivePermissions: Permission[];
    modeSelect: string;

    constructor(
        @Inject(MAT_DIALOG_DATA) public userPackage: Package,
        private setPackagePermissions: SetPackagePermissionsGQL,
        private dialogRef: MatDialogRef<AddUserComponent>
    ) {
        this.updateSelectedPermission(Permission.VIEW);
    }

    public ngOnInit(): void {
        this.modeSelect = "VIEW";

        this.form = new FormGroup({
            username: this.usernameControl,
            message: this.messageControl
        });
    }

    public submit(event: any): void {
        event.preventDefault();

        if (this.hasErrors) {
            return;
        }

        this.state = "LOADING";
        this.loading = true;
        this.setPackagePermissions
            .mutate({
                identifier: {
                    catalogSlug: this.userPackage.identifier.catalogSlug,
                    packageSlug: this.userPackage.identifier.packageSlug
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
                        } else if (firstErrorMessage.includes("CANNOT_SET_PACKAGE_CREATOR_PERMISSIONS")) {
                            this.error = ErrorType.CANNOT_SET_PACKAGE_CREATOR_PERMISSIONS;
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

    public updateSelectedPermission(permission: Permission): void {
        this.permission = permission;
        this.effectivePermissions = getEffectivePermissions(permission);
    }

    public onUserInputChange(value: ChipData[]): void {
        this.usersChips = value;
        this.hasErrors = this.hasErrorsInAddedUsers();
    }

    public onLoadingStatusChange(value: boolean): void {
        this.loading = value;
    }

    private hasErrorsInAddedUsers(): boolean {
        return this.usersChips.some((c) => ChipState.ERROR === c.state);
    }

    private buildPermissionsArray(): SetPackagePermissionInput[] {
        return this.usersChips.map((c) => {
            return {
                usernameOrEmailAddress: c.usernameOrEmailAddress,
                permissions: this.effectivePermissions
            };
        });
    }
}
