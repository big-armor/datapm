import { ChangeDetectorRef, Component, OnInit } from "@angular/core";
import { FormControl, FormGroup } from "@angular/forms";
import { MatSnackBar } from "@angular/material/snack-bar";
import { MatDialogRef } from "@angular/material/dialog";
import { CreateMeGQL, EmailAddressAvailableGQL, UsernameAvailableGQL } from "src/generated/graphql";
import { usernameValidator, emailAddressValidator } from "src/app/helpers/validators";

enum State {
    INIT,
    AWAITING_RESPONSE,
    REJECTED,
    ERROR,
    SUCCESS,
    ERROR_AFTER_SIGNUP
}

@Component({
    selector: "app-sign-up-dialog",
    templateUrl: "./sign-up-dialog.component.html",
    styleUrls: ["./sign-up-dialog.component.scss"]
})
export class SignUpDialogComponent implements OnInit {
    State = State;

    state = State.INIT;

    signUpForm: FormGroup;

    constructor(
        private createMeGQL: CreateMeGQL,
        private usernameAvailableGQL: UsernameAvailableGQL,
        private emailAddressAvailableGQL: EmailAddressAvailableGQL,
        private componentChangeDetector: ChangeDetectorRef,
        private dialogRef: MatDialogRef<SignUpDialogComponent>,
        private snackbar: MatSnackBar
    ) {}

    ngOnInit(): void {
        this.signUpForm = new FormGroup({
            username: new FormControl("", {
                asyncValidators: [usernameValidator(this.usernameAvailableGQL, this.componentChangeDetector)],
                updateOn: "blur"
            }),
            emailAddress: new FormControl("", {
                asyncValidators: [
                    emailAddressValidator(this.emailAddressAvailableGQL, this.componentChangeDetector, true)
                ],
                updateOn: "blur"
            }),
            password: new FormControl("")
        });
    }

    formSubmit() {
        this.createMeGQL
            .mutate({
                value: {
                    username: this.signUpForm.value.username,
                    password: this.signUpForm.value.password,
                    emailAddress: this.signUpForm.value.emailAddress
                }
            })
            .toPromise()
            .then((result) => {
                if (result.errors) {
                    const errorMsg = result.errors[0].message;

                    if (errorMsg.startsWith("EMAIL_ADDRESS_NOT_AVAILABLE")) {
                        this.signUpForm.get("emailAddress").setErrors({ NOT_AVAILABLE: true });
                    } else if (errorMsg.startsWith("USERNAME_NOT_AVAILABLE")) {
                        this.signUpForm.get("username").setErrors({ NOT_AVAILABLE: true });
                    } else {
                        this.snackbar.open(errorMsg, null, {
                            duration: 5000,
                            panelClass: "notification-error",
                            verticalPosition: "top",
                            horizontalPosition: "right"
                        });
                    }

                    return;
                }

                this.state = State.SUCCESS;
            })
            .catch(() => {
                this.snackbar.open("Unknown error", null, {
                    duration: 5000,
                    panelClass: "notification-error",
                    verticalPosition: "top",
                    horizontalPosition: "right"
                });
            });
    }

    openForgotPassword() {
        this.dialogRef.close("forgotPassword");
    }

    clearError(field: string) {
        const control = this.signUpForm.get(field);
        if (control.errors !== null) {
            control.setErrors(null);
            this.componentChangeDetector.detectChanges();
        }
    }
}
