import { Component, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { ForgotMyPasswordGQL } from "src/generated/graphql";
import { MatDialog, MatDialogRef } from "@angular/material/dialog";
import { LoginDialogComponent } from "../login-dialog/login-dialog.component";

enum State {
    INIT,
    AWAITING_RESPONSE,
    REJECTED,
    ERROR,
    SUCCESS,
    ERROR_AFTER_SIGNUP
}

@Component({
    selector: "app-forgot-password-dialog",
    templateUrl: "./forgot-password-dialog.component.html",
    styleUrls: ["./forgot-password-dialog.component.scss"]
})
export class ForgotPasswordDialogComponent implements OnInit {
    State = State;

    state = State.SUCCESS;
    error: string = "";

    form: FormGroup;

    constructor(
        formBuilder: FormBuilder,
        private forgotMyPasswordGQL: ForgotMyPasswordGQL,
        private dialog: MatDialog,
        private dialogRef: MatDialogRef<ForgotPasswordDialogComponent>
    ) {
        this.form = formBuilder.group({
            emailAddress: [
                "",
                {
                    validators: [Validators.required, Validators.email],
                    updateOn: "blur"
                }
            ]
        });
    }

    ngOnInit(): void {}

    formSubmit() {
        if (!this.form.valid) {
            return;
        }

        this.forgotMyPasswordGQL
            .mutate({
                emailAddress: this.form.value.emailAddress
            })
            .subscribe(
                () => {
                    this.state = State.SUCCESS;
                },
                (err) => {
                    this.state = State.ERROR_AFTER_SIGNUP;
                    this.error = err.message || "Unknown error occured";
                }
            );
    }

    backToLogin(ev: any) {
        ev.preventDefault();
        this.dialogRef.close();
        this.dialogRef.afterClosed().subscribe(() => {
            this.dialog.open(LoginDialogComponent);
        });
    }
}
