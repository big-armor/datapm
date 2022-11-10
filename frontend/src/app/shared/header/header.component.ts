import { Component, OnInit, OnDestroy } from "@angular/core";
import { ActivatedRoute, ParamMap, Router } from "@angular/router";
import { FormControl } from "@angular/forms";
import { takeUntil, debounceTime, switchMap } from "rxjs/operators";
import { Subject } from "rxjs";

import { AuthenticationService } from "../../services/authentication.service";
import { DialogService } from "../../services/dialog/dialog.service";
import { AutoCompleteGQL, AutoCompleteResult, CurrentUser } from "src/generated/graphql";
import { MatDialog } from "@angular/material/dialog";
import { LoginDialogComponent } from "./login-dialog/login-dialog.component";
import { SignUpDialogComponent } from "./sign-up-dialog/sign-up-dialog.component";
import { ForgotPasswordDialogComponent } from "./forgot-password-dialog/forgot-password-dialog.component";
import { CreatePackageModalComponent } from "../command-modal/package/create-package-modal.component";
enum State {
    INIT,
    LOADING,
    ERROR,
    SUCCESS,
    ERROR_NOT_UNIQUE
}

interface Option {
    package?: string;
    collection?: string;
}
@Component({
    selector: "sd-header",
    templateUrl: "./header.component.html",
    styleUrls: ["./header.component.scss"]
})
export class HeaderComponent implements OnInit, OnDestroy {
    state = State.INIT;

    currentUser: CurrentUser;
    searchControl: FormControl;
    private subscription = new Subject();

    autoCompleteResult: AutoCompleteResult;

    constructor(
        private matDialog: MatDialog,
        private dialog: DialogService,
        private router: Router,
        private route: ActivatedRoute,
        private authenticationService: AuthenticationService,
        private autocomplete: AutoCompleteGQL
    ) {
        this.searchControl = new FormControl("");
    }

    public ngOnInit(): void {
        this.searchControl.valueChanges
            .pipe(
                debounceTime(500),
                switchMap((value) => {
                    if (!value || value.length < 2) {
                        this.autoCompleteResult = null;
                        return [];
                    }
                    return this.autocomplete.fetch({ startsWith: value });
                })
            )
            .subscribe((result) => {
                if (result.errors != null) {
                    this.autoCompleteResult = null;
                } else {
                    this.autoCompleteResult = result.data.autoComplete;
                }
            });

        this.route.queryParamMap.pipe(takeUntil(this.subscription)).subscribe((queryParams: ParamMap) => {
            this.searchControl.setValue(queryParams.get("q") || "");
        });
        this.authenticationService.currentUser.pipe(takeUntil(this.subscription)).subscribe((user: CurrentUser) => {
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

    public autoComplete(val: string): void {
        this.autocomplete.fetch({ startsWith: val }).subscribe(({ data }) => {
            if (!data) return;
            this.autoCompleteResult = data.autoComplete;
        });
    }

    public ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    public openLoginDialog(): void {
        this.dialog.openLoginDialog();
    }

    public openSignUpDialog(): void {
        this.dialog.openSignupDialog();
    }

    public search(): void {
        this.router.navigate(["/search"], { queryParams: { q: this.searchControl.value } });
    }

    public goHome(): void {
        this.router.navigate(["/"]);
    }

    public goToAdminDashboard(): void {
        this.router.navigate(["admin"]);
    }

    public goToMyDetails(): void {
        this.router.navigate([this.currentUser?.user.username]);
    }

    public logout(): void {
        this.authenticationService.logout();
        setTimeout(() => (this.currentUser = null), 500);
        window.location.reload();
    }

    public autoCompleteOptionSelected(event): void {
        if (!event.option || !event.option.value) {
            return;
        }

        this.router.navigate(["/" + event.option.value]);
        this.searchControl.setValue("");
        this.autoCompleteResult = null;
    }

    public async publishClicked(): Promise<void> {
        if (!this.currentUser) this.dialog.openLoginDialog();

        // TODO would be better to return an observable that allows us to open the
        // publish dialog after successful login

        const dialogRef = this.matDialog
            .open(CreatePackageModalComponent, {
                data: {
                    targetCatalogSlug: this.currentUser.user.username
                },
                disableClose: true
            })
            .afterClosed()
            .subscribe(() => {});
    }


}
