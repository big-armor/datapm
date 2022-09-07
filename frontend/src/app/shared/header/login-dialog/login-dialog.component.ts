import { Component, OnDestroy, OnInit } from "@angular/core";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { Router, ActivatedRoute, Params } from "@angular/router";
import { MatDialogRef } from "@angular/material/dialog";
import { AuthenticationService } from "src/app/services/authentication.service";
import { AUTHENTICATION_ERROR, User } from "src/generated/graphql";
import { Subscription } from "rxjs";
import { DialogService } from "src/app/services/dialog/dialog.service";

enum State {
    LOGGED_OUT,
    AWAITING_RESPONSE,
    INCORRECT_LOGIN,
    LOGGED_IN,
    LOGIN_ERROR,
    LOGIN_ERROR_VALIDATE_EMAIL,
    LOGIN_ERROR_ACCOUNT_SUSPENDED
}

@Component({
    selector: "app-login-dialog",
    templateUrl: "./login-dialog.component.html",
    styleUrls: ["./login-dialog.component.scss"]
})
export class LoginDialogComponent implements OnInit, OnDestroy {
    public State = State;
    public state = State.LOGGED_OUT;

    public loginForm = new FormGroup({
        username: new FormControl("", Validators.required),
        password: new FormControl("", Validators.required)
    });

    private subscription: Subscription;
    private queryParams: Params;
    private fragment: string;

    constructor(
        private authenticationService: AuthenticationService,
        private route: ActivatedRoute,
        private router: Router,
        private dialog: DialogService,
        private dialogRef: MatDialogRef<LoginDialogComponent>
    ) {}

    public ngOnInit(): void {
        if (this.authenticationService.currentUser.value != null) {
            this.state = State.LOGGED_IN;
        }

        this.subscription = this.authenticationService.currentUser.subscribe((currentUser) => {
            if (!currentUser) {
                this.state = State.LOGGED_OUT;
            } else {
                this.state = State.LOGGED_IN;
            }
        });
        this.fragment = this.route.snapshot.fragment || null;
        this.queryParams = this.route.snapshot.queryParams || [];
    }

    public ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    public formSubmit(): void {
        this.state = State.AWAITING_RESPONSE;

        this.authenticationService.login(this.loginForm.value.username, this.loginForm.value.password).subscribe(
            (value: { errors; data: { me: { username: string } } }) => {
                if (value.errors) {
                    if (value.errors.find((e) => e.message === AUTHENTICATION_ERROR.WRONG_CREDENTIALS)) {
                        this.state = State.INCORRECT_LOGIN;
                    } else if (
                        value.errors.find((e) => e.message === AUTHENTICATION_ERROR.EMAIL_ADDRESS_NOT_VERIFIED)
                    ) {
                        this.state = State.LOGIN_ERROR_VALIDATE_EMAIL;
                    } else if (value.errors.find((e) => e.message === AUTHENTICATION_ERROR.ACCOUNT_SUSPENDED)) {
                        this.state = State.LOGIN_ERROR_ACCOUNT_SUSPENDED;
                    } else {
                        this.state = State.LOGIN_ERROR;
                    }
                    return;
                }

                this.state = State.LOGGED_IN;
                const returnUrl = this.route.queryParams["returnUrl"];
                if (returnUrl) {
                    this.router.navigate([returnUrl], { queryParams: this.queryParams, fragment: this.fragment });
                } else {
                    if (window.location.href.includes("validate-email"))
                        window.location.href = "/" + this.loginForm.value.username;
                    else window.location.reload();
                }
                this.dialogRef.close();
            },
            () => {
                this.state = State.LOGIN_ERROR;
            }
        );
    }

    public openForgotPasswordDialog(ev: any): void {
        ev.preventDefault();
        this.dialogRef.close();
        this.dialogRef.afterClosed().subscribe(() => {
            this.dialog.openForgotPasswordDialog();
        });
    }

    public openSignupDialog(ev: any): void {
        ev.preventDefault();
        this.dialogRef.close();
        this.dialogRef.afterClosed().subscribe(() => {
            this.dialog.openSignupDialog();
        });
    }
}
