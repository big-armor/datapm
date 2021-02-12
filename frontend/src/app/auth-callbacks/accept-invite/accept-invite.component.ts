import { Component, OnInit } from "@angular/core";
import { AbstractControl, FormControl, FormGroup, ValidationErrors, Validators } from "@angular/forms";
import { MatDialog, MatDialogRef } from "@angular/material/dialog";
import { ActivatedRoute, Router } from "@angular/router";
import { GraphQLError } from "graphql";
import { AuthenticationService } from "src/app/services/authentication.service";
import { LoginDialogComponent } from "src/app/shared/header/login-dialog/login-dialog.component";
import { AcceptInviteGQL, AUTHENTICATION_ERROR } from "src/generated/graphql";
import { DialogService } from "src/app/services/dialog/dialog.service";

let componentInstance;
@Component({
    selector: "app-accept-invite",
    templateUrl: "./accept-invite.component.html",
    styleUrls: ["./accept-invite.component.scss"]
})
export class AcceptInviteComponent implements OnInit {
    public errorMessage: string;

    public loading = false;

    public showForgotPasswordButton = false;

    public usernameControl = new FormControl("", {
        validators: [Validators.required],
        updateOn: "blur"
    });
    public passwordControl = new FormControl("", {
        validators: [Validators.required],
        updateOn: "blur"
    });

    public acceptInviteForm = new FormGroup({
        username: this.usernameControl,
        password: this.passwordControl
    });

    public token: string;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private dialog: MatDialog,
        private authenticationService: AuthenticationService,
        private acceptInvite: AcceptInviteGQL,
        private matDialog: MatDialog,
        private dialogService: DialogService,
        private dialogRef: MatDialogRef<LoginDialogComponent>
    ) {
        componentInstance = this;
    }

    public openLogin() {
        this.matDialog.open(LoginDialogComponent, {
            disableClose: true
        });
    }

    public openForgotPasswordDialog(ev: any) {
        ev.preventDefault();
        this.dialogService.openForgotPasswordDialog();
    }

    public ngOnInit(): void {
        if (this.authenticationService.currentUser.value != null) {
            this.router.navigate([""]);
            return;
        }

        this.token = this.route.snapshot.queryParamMap.get("token");
        if (!this.token) {
            this.errorMessage = "Token is invalid";
            return;
        }
    }

    public submit(): void {
        if (!this.acceptInviteForm.valid) {
            return;
        }

        this.loading = true;
        this.showForgotPasswordButton = false;
        this.acceptInvite
            .mutate({
                username: this.usernameControl.value,
                password: this.passwordControl.value,
                token: this.token
            })
            .subscribe(
                ({ errors }) => {
                    if (errors && errors.length) {
                        if (errors[0].message === "TOKEN_NOT_VALID") {
                            this.attemptLoginAfterInvalidToken(errors);
                            return;
                        }

                        this.errorMessage = this.getErrorMessageFromCode(errors[0].message);
                        this.loading = false;
                        return;
                    }

                    this.errorMessage = null;

                    this.loginAfterSuccessfulAcceptInvite();
                },
                (error) => {
                    this.errorMessage = this.getErrorMessageFromCode(error);
                    this.loading = false;
                }
            );
    }

    public loginAfterSuccessfulAcceptInvite() {
        this.authenticationService.login(this.usernameControl.value, this.passwordControl.value).subscribe(
            (value: { errors; data: { me: { username: string } } }) => {
                if (value.errors) {
                    this.errorMessage = value.errors[0].message;
                    this.loading = false;
                    return;
                }

                this.loading = false;
                const returnUrl = this.route.queryParams["returnUrl"] || "/" + value.data.me.username;
                this.dialog.closeAll();
                this.router.navigate([returnUrl]);
            },
            (error) => {
                this.loading = false;
                this.errorMessage = error.message;
                this.loading = false;
            }
        );
    }

    public attemptLoginAfterInvalidToken(originalError: readonly GraphQLError[]) {
        this.authenticationService.login(this.usernameControl.value, this.passwordControl.value).subscribe(
            (value: { errors; data: { me: { username: string } } }) => {
                if (value.errors) {
                    if (value.errors.find((e) => e.message === AUTHENTICATION_ERROR.WRONG_CREDENTIALS)) {
                        this.loading = false;
                        this.errorMessage =
                            "This invite token has already been claimed. And the username and password you entered are not correct.";
                        this.showForgotPasswordButton = true;
                    } else if (
                        value.errors.find((e) => e.message === AUTHENTICATION_ERROR.EMAIL_ADDRESS_NOT_VERIFIED)
                    ) {
                        this.loading = false;
                        this.errorMessage =
                            "Check your inbox for a validation email, and click the link in that email.";
                    } else if (value.errors.find((e) => e.message === AUTHENTICATION_ERROR.ACCOUNT_SUSPENDED)) {
                        this.loading = false;
                        this.errorMessage = "Your account has been suspended";
                    } else {
                        this.loading = false;
                        this.errorMessage = originalError[0].message;
                    }
                    return;
                }

                const returnUrl = this.route.queryParams["returnUrl"] || "/" + value.data.me.username;
                this.dialog.closeAll();
                this.router.navigate([returnUrl]);
            },
            () => {
                this.loading = false;
                this.errorMessage = originalError[0].message;
            }
        );
    }

    public openLoginDialog() {
        this.dialog.open(LoginDialogComponent, {
            disableClose: true
        });
    }

    private getErrorMessageFromCode(errorCode: string): string {
        switch (errorCode) {
            case "TOKEN_NOT_VALID":
                return "Token not valid.";
            case "USERNAME_NOT_AVAILABLE":
                return "Username " + this.usernameControl.value + " is not available.";
            case "USERNAME_REQUIRED":
                return "Username is required.";
            case "PASSWORD_REQUIRED":
                return "Password is required.";
            case "USERNAME_TOO_LONG":
                return "Username is too long (> 250 characters).";
            case "PASSWORD_TOO_LONG":
                return "Password is too long (> 250 characters).";
            case "PASSWORD_TOO_SHORT":
                return "Password is too short.";
            case "INVALID_CHARACTERS":
                return "Username or password contains invalid characters";
            default:
                return "Something went wrong accepting your invitation.";
        }
    }
}
