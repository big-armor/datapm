import { Component, OnInit, OnDestroy } from "@angular/core";
import { ActivatedRoute, DefaultUrlSerializer, NavigationEnd, Router } from "@angular/router";
import { FormControl, FormGroup } from "@angular/forms";
import { MatDialog } from "@angular/material/dialog";
import { filter, takeUntil } from "rxjs/operators";
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
    searchFormGroup: FormGroup;
    mobileSearchFormGroup: FormGroup;
    private subscription = new Subject();
    private parameterSubject = new Subject();

    constructor(
        public dialog: MatDialog,
        private router: Router,
        private route: ActivatedRoute,
        private authenticationService: AuthenticationService
    ) {}

    ngOnInit(): void {
        this.router.events
            .pipe(takeUntil(this.parameterSubject))
            .pipe(filter((event) => event instanceof NavigationEnd))
            .subscribe((event: NavigationEnd) => {
                const serializer = new DefaultUrlSerializer();
                const parsedUrl = serializer.parse(event.url);
                this.searchTerm = parsedUrl.root.children.primary.segments[0]?.parameterMap.get("q") || null;
                console.log(`searchTerm ${this.searchTerm}`);
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
                }).catch((error) => (this.state = State.ERROR));
            });

        this.searchFormGroup = new FormGroup({
            search: new FormControl("")
        });

        this.mobileSearchFormGroup = new FormGroup({
            mobileSearch: new FormControl("")
        });
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
        this.parameterSubject.unsubscribe();
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
        const query = this.searchTerm;
        this.router.navigate(["/search", { q: query }]);
    }

    search() {
        const query = this.searchFormGroup.value.search;
        this.router.navigate(["/search", { q: query }]);
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
