import { Component, Inject, OnInit } from "@angular/core";
import { FormGroup, FormControl } from "@angular/forms";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { PageState } from "src/app/models/page-state";
import { getEffectivePermissions } from "src/app/services/permissions.service";
import { ChipData } from "src/app/shared/user-invite-input/chip-data";
import { ChipState } from "src/app/shared/user-invite-input/chip-state";
import {
    Collection,
    Permission,
    SetUserCollectionPermissionsGQL,
    SetUserCollectionPermissionsInput
} from "src/generated/graphql";

enum ErrorType {
    USER_NOT_FOUND = "USER_NOT_FOUND",
    CANNOT_SET_COLLECTION_CREATOR_PERMISSIONS = "CANNOT_SET_COLLECTION_CREATOR_PERMISSIONS"
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
        private setUserCollectionPermissionsGQL: SetUserCollectionPermissionsGQL,
        private dialogRef: MatDialogRef<AddUserComponent>,
        @Inject(MAT_DIALOG_DATA) public collection: Collection
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
        this.setUserCollectionPermissionsGQL
            .mutate({
                identifier: {
                    collectionSlug: this.collection.identifier.collectionSlug
                },
                value: this.buildPermissionsArray(),
                message: this.messageControl.value
            })
            .subscribe(
                ({ errors, data }) => {
                    if (errors) {
                        this.state = "ERROR";

                        const firstErrorMessage = errors[0].message;
                        if (firstErrorMessage.includes("USER_NOT_FOUND")) {
                            this.error = ErrorType.USER_NOT_FOUND;
                        } else if (firstErrorMessage.includes("CANNOT_SET_COLLECTION_CREATOR_PERMISSIONS")) {
                            this.error = ErrorType.CANNOT_SET_COLLECTION_CREATOR_PERMISSIONS;
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

    private buildPermissionsArray(): SetUserCollectionPermissionsInput[] {
        return this.usersChips.map((c) => {
            return {
                usernameOrEmailAddress: c.usernameOrEmailAddress,
                permissions: this.effectivePermissions
            };
        });
    }
}
