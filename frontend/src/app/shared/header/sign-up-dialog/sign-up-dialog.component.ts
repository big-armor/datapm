import { ChangeDetectorRef, Component, OnInit } from "@angular/core";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { CreateMeGQL, EmailAddressAvailableGQL, UsernameAvailableGQL } from "src/generated/graphql";
import { MatSnackBar } from "@angular/material/snack-bar";
import { MatDialogRef } from "@angular/material/dialog";
import { usernameValidator, emailAddressValidator, newPasswordValidator } from "src/app/helpers/validators";
import { UiStyleToggleService } from "src/app/services/ui-style-toggle.service";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { DialogService } from "src/app/services/dialog/dialog.service";

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
    private readonly destroy = new Subject<void>();

    public State = State;
    public state = State.INIT;

    public signUpForm: FormGroup;

    public errorMessages = {
        emailAddress: {
            INVALID_EMAIL_ADDRESS_FORMAT: "Not a valid email address.",
            TOO_LONG: "Email address must be less than 100 characters long.",
            NOT_AVAILABLE:
                "That email address already has an account. Please use the forgot password feature on the login page."
        },
        username: {
            INVALID_CHARACTERS:
                "Username must contain only numbers, letters, and hyphens, and may not start or end with a hyphen.",
            TOO_LONG: "Username must be less than 40 characters long.",
            NOT_AVAILABLE: "That username is not available. Try a different username.",
            RESERVED_KEYWORD: "The username you used is a restricted keyword. Please choose another name"
        },
        password: {
            INVALID_CHARACTERS: "Password must contain letters and at least a number.",
            PASSWORD_TOO_LONG: "Password must be less than 99 characters long.",
            PASSWORD_TOO_SHORT: "Password must be more than 8 characters long.",
            REQUIRED: "Password is required."
        }
    };

    private darkModeEnabled = false;

    constructor(
        private createMeGQL: CreateMeGQL,
        private usernameAvailableGQL: UsernameAvailableGQL,
        private emailAddressAvailableGQL: EmailAddressAvailableGQL,
        private componentChangeDetector: ChangeDetectorRef,
        private dialogRef: MatDialogRef<SignUpDialogComponent>,
        private snackbar: MatSnackBar,
        private dialog: DialogService,
        private uiStyleToggleService: UiStyleToggleService
    ) {}

    public ngOnInit(): void {
        this.uiStyleToggleService.DARK_MODE_ENABLED.pipe(takeUntil(this.destroy)).subscribe(
            (darkModeEnabled) => (this.darkModeEnabled = darkModeEnabled)
        );

        this.signUpForm = new FormGroup({
            username: new FormControl("", {
                asyncValidators: [usernameValidator(this.usernameAvailableGQL, this.componentChangeDetector, "")],
                updateOn: "blur"
            }),
            emailAddress: new FormControl("", {
                asyncValidators: [
                    emailAddressValidator(this.emailAddressAvailableGQL, this.componentChangeDetector, true)
                ],
                updateOn: "blur"
            }),
            password: new FormControl("", {
                asyncValidators: [newPasswordValidator()],
                updateOn: "blur"
            })
        });
    }

    public formSubmit(): void {
        this.signUpForm.markAllAsTouched();
        if (this.signUpForm.invalid) {
            return;
        }

        this.createMeGQL
            .mutate({
                value: {
                    username: this.signUpForm.value.username,
                    password: this.signUpForm.value.password,
                    emailAddress: this.signUpForm.value.emailAddress,
                    uiDarkModeEnabled: this.darkModeEnabled
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

                    this.state = State.ERROR;
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
                this.state = State.ERROR;
            });
    }

    openLoginDialog(ev: any) {
        ev.preventDefault();
        this.dialogRef.close();
        this.dialogRef.afterClosed().subscribe(() => {
            this.dialog.openLoginDialog();
        });
    }
}
