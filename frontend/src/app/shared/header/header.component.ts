import { Component, OnInit, OnDestroy } from "@angular/core";
import { ActivatedRoute, ParamMap, Router } from "@angular/router";
import { FormControl, FormGroup } from "@angular/forms";
import { MatDialog } from "@angular/material/dialog";
import { takeUntil } from "rxjs/operators";
import { Subject } from "rxjs";

import { AuthenticationService } from "../../services/authentication.service";
import { LoginDialogComponent } from "./login-dialog/login-dialog.component";
import { SignUpDialogComponent } from "./sign-up-dialog/sign-up-dialog.component";
import { ForgotPasswordDialogComponent } from "./forgot-password-dialog/forgot-password-dialog.component";
import { User } from "src/generated/graphql";

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
    searchTerm: String;
    private subscription = new Subject();

    constructor(
        public dialog: MatDialog,
        private router: Router,
        private route: ActivatedRoute,
        private authenticationService: AuthenticationService
    ) {}

    ngOnInit(): void {
        this.route.queryParamMap.pipe(takeUntil(this.subscription)).subscribe((queryParams: ParamMap) => {
            this.searchTerm = queryParams.get("q") || null;
        });
        this.authenticationService
            .getUserObservable()
            .pipe(takeUntil(this.subscription))
            .subscribe((u) => {
                if (u == null) {
                    return;
                }

                u.then((user) => {
                    this.currentUser = user;
                    this.state = State.SUCCESS;
                }).catch(() => (this.state = State.ERROR));
            });
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    openLoginDialog() {
        this.dialog.open(LoginDialogComponent, {
            disableClose: true
        });
    }

    openSignUpDialog() {
        const signupDialogRef = this.dialog.open(SignUpDialogComponent, {
            disableClose: true
        });
        signupDialogRef.afterClosed().subscribe((result?: string) => {
            if (result === "forgotPassword") {
                this.dialog.open(ForgotPasswordDialogComponent);
            }
        });
    }

    mobileSearch() {
        this.router.navigate(["/search"], { queryParams: { q: this.searchTerm } });
    }

    search() {
        this.router.navigate(["/search"], { queryParams: { q: this.searchTerm } });
    }

    goHome() {
        this.router.navigate(["/"]);
    }

    goToMyDetails() {
        this.router.navigate(["/me"]);
    }

    logout() {
        this.authenticationService.logout();
        setTimeout(() => (this.currentUser = null), 500);
        this.router.navigate(["/"]);
    }
}
