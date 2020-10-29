import { Component, OnInit, Inject, ChangeDetectorRef } from "@angular/core";
import { MAT_DIALOG_DATA } from "@angular/material/dialog";
import { FormGroup, FormControl, AbstractControl, ValidationErrors } from "@angular/forms";

import { User, UpdateMyPasswordGQL } from "src/generated/graphql";
import { AuthenticationService } from "src/app/services/authentication.service";

function currentPasswordValidator() {
    return (control: AbstractControl): Promise<ValidationErrors | null> => {
        return new Promise<ValidationErrors | null>((success, error) => {
            if (control.value == "testpassword1") {
                success(null);
                return;
            }
            if (control.value === "" || control.value === null) {
                success({
                    REQUIRED: true
                });
                return;
            }
            if (control.value !== "testpassword1") {
                success({
                    NO_PASSWORD_MATCH: true
                });
            }
        });
    };
}

function newPasswordValidator() {
    return (control: AbstractControl): Promise<ValidationErrors | null> => {
        return new Promise<ValidationErrors | null>((success, error) => {
            const regex = /[0-9@#$%]/;

            if (control.value == "" || control.value == null) {
                success({
                    REQUIRED: true
                });
                return;
            }
            if (control.value.length > 99) {
                success({
                    PASSWORD_TOO_LONG: true
                });
            }
            if (control.value.length < 8) {
                success({
                    PASSWORD_TOO_SHORT: true
                });
            }
            if (control.value.length < 16 && control.value.match(regex) == null) {
                success({
                    INVALID_CHARACTERS: true
                });
            }
        });
    };
}

@Component({
    selector: "app-edit-password-dialog",
    templateUrl: "./edit-password-dialog.component.html",
    styleUrls: ["./edit-password-dialog.component.scss"]
})
export class EditPasswordDialogComponent implements OnInit {
    public currentUser: User;
    public form: FormGroup;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: User,
        private updateMyPasswordGQL: UpdateMyPasswordGQL,
        private authenticationService: AuthenticationService
    ) {}

    ngOnInit(): void {
        this.currentUser = this.data;

        this.form = new FormGroup({
            currentPassword: new FormControl(undefined, {
                asyncValidators: [currentPasswordValidator()],
                updateOn: "change"
            }),
            newPassword: new FormControl(undefined, { asyncValidators: [newPasswordValidator()], updateOn: "change" })
        });
    }

    submit() {
        this.form.markAllAsTouched();
        this.form.markAsDirty();
        if (this.form.invalid) {
            return;
        }
        this.updateMyPasswordGQL
            .mutate({
                value: {
                    newPassword: this.newPassword.value,
                    oldPassword: this.currentPassword.value
                }
            })
            .subscribe((res) => {
                if (res.errors) {
                    console.warn(res.errors);
                }
                if (res.data) {
                    this.authenticationService.login(this.currentUser.username, this.newPassword.value);
                }
            });
    }

    get currentPassword() {
        return this.form.get("currentPassword")! as FormControl;
    }

    get newPassword() {
        return this.form.get("newPassword")! as FormControl;
    }
}
