import { Component, OnInit, OnDestroy } from "@angular/core";
import { ActivatedRoute, ParamMap, Router } from "@angular/router";
import { FormControl } from "@angular/forms";
import { takeUntil } from "rxjs/operators";
import { Subject } from "rxjs";

import { AuthenticationService } from "../../services/authentication.service";
import { DialogService } from "../../services/dialog.service";
import { User } from "src/generated/graphql";
import { MatDialog } from "@angular/material/dialog";
import { LoginDialogComponent } from "./login-dialog/login-dialog.component";
import { SignUpDialogComponent } from "./sign-up-dialog/sign-up-dialog.component";
import { ForgotPasswordDialogComponent } from "./forgot-password-dialog/forgot-password-dialog.component";

enum State {
    INIT,
    LOADING,
    ERROR,
    SUCCESS,
    ERROR_NOT_UNIQUE
}
@Component({
    selector: "sd-header",
    templateUrl: "./header.component.html",
    styleUrls: ["./header.component.scss"]
})
export class HeaderComponent implements OnInit, OnDestroy {
    state = State.INIT;

    currentUser: User;
    searchControl: FormControl;
    private subscription = new Subject();

    constructor(
        private matDialog: MatDialog,
        private dialog: DialogService,
        private router: Router,
        private route: ActivatedRoute,
        private authenticationService: AuthenticationService
    ) {
        this.searchControl = new FormControl("");
    }

    ngOnInit(): void {
        this.route.queryParamMap.pipe(takeUntil(this.subscription)).subscribe((queryParams: ParamMap) => {
            this.searchControl.setValue(queryParams.get("q") || "");
        });
        this.authenticationService.currentUser.pipe(takeUntil(this.subscription)).subscribe((user: User) => {
            this.currentUser = user;
            if (user) {
                this.state = State.SUCCESS;
            }
        });
        this.dialog.actions.pipe(takeUntil(this.subscription)).subscribe((action: string) => {
            switch (action) {
                case "login":
                    this.matDialog.open(LoginDialogComponent, {
                        disableClose: true
                    });
                    break;
                case "forgotPassword":
                    this.matDialog.open(ForgotPasswordDialogComponent, {
                        disableClose: true
                    });
                    break;
                case "signup":
                    const signupDialogRef = this.matDialog.open(SignUpDialogComponent, {
                        disableClose: true
                    });
                    signupDialogRef.afterClosed().subscribe((result?: string) => {
                        if (result === "forgotPassword") {
                            this.dialog.openForgotPasswordDialog();
                        }
                    });
                    break;
                case "closeAll":
                    this.matDialog.closeAll();
                    break;
                default:
                    break;
            }
        });
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    openLoginDialog() {
        this.dialog.openLoginDialog();
    }

    openSignUpDialog() {
        this.dialog.openSignupDialog();
    }

    search() {
        console.log(this.searchControl.value);
        this.router.navigate(["/search"], { queryParams: { q: this.searchControl.value } });
    }

    goHome() {
        this.router.navigate(["/"]);
    }

    goToMyDetails() {
        this.router.navigate([this.currentUser?.username]);
    }

    logout() {
        this.authenticationService.logout();
        setTimeout(() => (this.currentUser = null), 500);
        this.router.navigate(["/"]);
    }
}
