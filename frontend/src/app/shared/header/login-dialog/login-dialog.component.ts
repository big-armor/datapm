import { Component, OnDestroy, OnInit } from "@angular/core";
import { FormBuilder, FormControl, FormGroup, Validators } from "@angular/forms";
import { Router, ActivatedRoute } from "@angular/router";
import { MatDialog } from "@angular/material/dialog";
import { AuthenticationService } from "src/app/services/authentication.service";
import { AUTHENTICATION_ERROR, LoginGQL } from "src/generated/graphql";
import { Subscription } from "rxjs";
enum State {
    LOGGED_OUT,
    AWAITING_RESPONSE,
    INCORRECT_LOGIN,
    LOGGED_IN,
    LOGIN_ERROR,
    LOGIN_ERROR_VALIDATE_EMAIL
}

@Component({
    selector: "app-login-dialog",
    templateUrl: "./login-dialog.component.html",
    styleUrls: ["./login-dialog.component.scss"]
})
export class LoginDialogComponent implements OnInit, OnDestroy {
    State = State;

    public state = State.LOGGED_OUT;
    private subscription: Subscription;

    loginForm = new FormGroup({
        username: new FormControl("", Validators.required),
        password: new FormControl("", Validators.required)
    });

    constructor(
        private loginGQL: LoginGQL,
        private authenticationService: AuthenticationService,
        private route: ActivatedRoute,
        private router: Router,
        private dialog: MatDialog
    ) {}

    ngOnInit(): void {
        if (this.authenticationService.currentUser != null) {
            this.state = State.LOGGED_IN;
        }

        this.subscription = this.authenticationService.getUserObservable().subscribe((userPromise) => {
            if (userPromise == null) {
                this.state = State.LOGGED_OUT;
                return;
            }

            userPromise.then((user) => {
                if (user != null) {
                    this.state = State.LOGGED_IN;
                }
                if (this.state == State.LOGGED_IN) {
                    this.state = State.LOGGED_OUT;
                }
            });
        });
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    formSubmit() {
        this.state = State.AWAITING_RESPONSE;

        this.authenticationService
            .login(this.loginForm.value.username, this.loginForm.value.password)
            .then((user) => {
                this.state = State.LOGGED_IN;

                const returnUrl = this.route.queryParams["returnUrl"] || "/me";

                this.dialog.closeAll();
                this.router.navigate([returnUrl]);
            })
            .catch((error: any) => {
                if (error.errors?.find((e) => e.message == AUTHENTICATION_ERROR.WRONG_CREDENTIALS) != null) {
                    this.state = State.INCORRECT_LOGIN;
                } else if (
                    error.errors?.find((e) => e.message == AUTHENTICATION_ERROR.EMAIL_ADDRESS_NOT_VERIFIED) != null
                ) {
                    this.state = State.LOGIN_ERROR_VALIDATE_EMAIL;
                } else {
                    this.state = State.LOGIN_ERROR;
                }
            });
    }
}
