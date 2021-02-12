import { Component, OnInit } from "@angular/core";
import { AbstractControl, FormControl, FormGroup, ValidationErrors, Validators } from "@angular/forms";
import { MatDialog } from "@angular/material/dialog";
import { ActivatedRoute, Router } from "@angular/router";
import { AuthenticationService } from "src/app/services/authentication.service";
import { LoginDialogComponent } from "src/app/shared/header/login-dialog/login-dialog.component";
import { AcceptInviteGQL } from "src/generated/graphql";

let componentInstance;
@Component({
    selector: "app-accept-invite",
    templateUrl: "./accept-invite.component.html",
    styleUrls: ["./accept-invite.component.scss"]
})
export class AcceptInviteComponent implements OnInit {
    public errorMessage: string;

    public acceptedInvitation = false;
    public loading = false;

    public usernameControl = new FormControl("", { validators: [Validators.required], updateOn: "blur" });
    public passwordControl = new FormControl("", { validators: [Validators.required], updateOn: "blur" });
    public confirmPasswordControl = new FormControl("", {
        validators: [Validators.required, this.validatePasswordConfirm],
        updateOn: "blur"
    });

    public acceptInviteForm = new FormGroup({
        username: this.usernameControl,
        password: this.passwordControl,
        confirmPassword: this.confirmPasswordControl
    });

    public token: string;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private dialog: MatDialog,
        private authenticationService: AuthenticationService,
        private acceptInvite: AcceptInviteGQL
    ) {
        componentInstance = this;
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
        this.acceptInvite
            .mutate({
                username: this.usernameControl.value,
                password: this.passwordControl.value,
                token: this.token
            })
            .subscribe(
                ({ errors }) => {
                    if (errors && errors.length) {
                        this.errorMessage = this.getErrorMessageFromCode(errors[0].message);
                        this.loading = false;
                        return;
                    }

                    this.errorMessage = null;
                    this.loading = false;
                    this.acceptedInvitation = true;
                },
                (error) => {
                    this.errorMessage = this.getErrorMessageFromCode(error);
                    this.loading = false;
                }
            );
    }

    public openLoginDialog() {
        this.dialog.open(LoginDialogComponent, {
            disableClose: true
        });
    }

    public validatePassword(control: AbstractControl): ValidationErrors | null {
        if (!componentInstance) {
            return null;
        }

        return componentInstance.validatePasswordControl(control, "confirmPassword");
    }

    public validatePasswordConfirm(control: AbstractControl): ValidationErrors | null {
        if (!componentInstance) {
            return null;
        }

        return componentInstance.validatePasswordControl(control, "password");
    }

    public validatePasswordControl(control: AbstractControl, otherFormName: string): ValidationErrors | null {
        if (!control.value) {
            return {
                required: "You need to confirm your password"
            };
        }

        const otherControl = componentInstance.acceptInviteForm.controls[otherFormName];
        if (otherControl.value && control.value != otherControl.value) {
            return {
                PASSWORDS_DONT_MATCH: "The entered password and password confirmation must be the same"
            };
        }

        if (otherControl.errors) {
            otherControl.setErrors(null);
        }

        return null;
    }

    private getErrorMessageFromCode(errorCode: string): string {
        switch (errorCode) {
            case "TOKEN_NOT_VALID":
                return "Token not valid.";
            case "USERNAME_NOT_AVAILABLE":
                return "Username is not available.";
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
                return "Invalid characters not allowed.";
            default:
                return "Something went wrong accepting your invitation.";
        }
    }
}
