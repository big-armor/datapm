import { Component, OnDestroy, OnInit } from "@angular/core";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { Router, ActivatedRoute } from "@angular/router";
import { MatDialogRef } from "@angular/material/dialog";
import { AuthenticationService } from "src/app/services/authentication.service";
import { AUTHENTICATION_ERROR, User } from "src/generated/graphql";
import { Subscription } from "rxjs";
import { DialogService } from "src/app/services/dialog.service";

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
        private authenticationService: AuthenticationService,
        private route: ActivatedRoute,
        private router: Router,
        private dialog: DialogService,
        private dialogRef: MatDialogRef<LoginDialogComponent>
    ) {}

    ngOnInit(): void {
        if (this.authenticationService.currentUser.value != null) {
            this.state = State.LOGGED_IN;
        }

        this.subscription = this.authenticationService.currentUser.subscribe((user: User) => {
            if (!user) {
                this.state = State.LOGGED_OUT;
            } else {
                this.state = State.LOGGED_IN;
            }
        });
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    formSubmit() {
        this.state = State.AWAITING_RESPONSE;

        this.authenticationService.login(this.loginForm.value.username, this.loginForm.value.password).subscribe(
            ({ errors }) => {
                if (errors) {
                    if (errors.find((e) => e.message === AUTHENTICATION_ERROR.WRONG_CREDENTIALS)) {
                        this.state = State.INCORRECT_LOGIN;
                    } else if (errors.find((e) => e.message === AUTHENTICATION_ERROR.EMAIL_ADDRESS_NOT_VERIFIED)) {
                        this.state = State.LOGIN_ERROR_VALIDATE_EMAIL;
                    } else {
                        this.state = State.LOGIN_ERROR;
                    }
                    return;
                }

                this.state = State.LOGGED_IN;
                const returnUrl = this.route.queryParams["returnUrl"] || "/me";
                this.dialog.closeAll();
                this.router.navigate([returnUrl]);
            },
            () => {
                this.state = State.LOGIN_ERROR;
            }
        );
    }

    openForgotPasswordDialog(ev: any) {
        ev.preventDefault();
        this.dialogRef.close();
        this.dialogRef.afterClosed().subscribe(() => {
            this.dialog.openForgotPasswordDialog();
        });
    }
}
