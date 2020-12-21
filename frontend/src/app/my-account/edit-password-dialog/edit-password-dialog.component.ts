import { Component, OnInit, Inject } from "@angular/core";
import { MatDialog, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { FormGroup, FormControl } from "@angular/forms";

import { User, UpdateMyPasswordGQL } from "src/generated/graphql";
import { SnackBarService } from "src/app/services/snackBar.service";
import { newPasswordValidator } from "src/app/helpers/validators";

enum State {
    INIT,
    READY,
    PENDING_RESPONSE,
    SUCCESS,
    WRONG_CREDENTIALS,
    ERROR
}
@Component({
    selector: "app-edit-password-dialog",
    templateUrl: "./edit-password-dialog.component.html",
    styleUrls: ["./edit-password-dialog.component.scss"]
})
export class EditPasswordDialogComponent implements OnInit {
    State = State;
    state = State.INIT;

    public currentUser: User;
    public form: FormGroup;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: User,
        private dialog: MatDialog,
        private updateMyPasswordGQL: UpdateMyPasswordGQL,
        private snackBarService: SnackBarService
    ) {}

    ngOnInit(): void {
        this.currentUser = this.data;

        this.form = new FormGroup({
            currentPassword: new FormControl(undefined, {
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
        this.state = State.PENDING_RESPONSE;
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
                    this.state = State.ERROR;
                    if (res.errors?.find((e) => e.message == "WRONG_CREDENTIALS") != null) {
                        this.state = State.WRONG_CREDENTIALS;
                    }
                    return;
                } else {
                    this.dialog.closeAll();
                    this.snackBarService.openSnackBar("Password updated!", "Close");
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
