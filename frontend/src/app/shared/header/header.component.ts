import { Component, OnInit, OnDestroy, ElementRef, AfterViewInit } from "@angular/core";
import { ActivatedRoute, ParamMap, Router } from "@angular/router";
import { FormControl } from "@angular/forms";
import { takeUntil, startWith, map, filter, debounceTime, switchMap } from "rxjs/operators";
import { Subject, Observable, BehaviorSubject } from "rxjs";

import { AuthenticationService } from "../../services/authentication.service";
import { DialogService } from "../../services/dialog/dialog.service";
import { AutoCompleteGQL, AutoCompleteResult, User } from "src/generated/graphql";
import { MatDialog } from "@angular/material/dialog";
import { LoginDialogComponent } from "./login-dialog/login-dialog.component";
import { SignUpDialogComponent } from "./sign-up-dialog/sign-up-dialog.component";
import { ForgotPasswordDialogComponent } from "./forgot-password-dialog/forgot-password-dialog.component";
import { BuilderIOService } from "src/app/imported/resource-importer.service";

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
export class HeaderComponent implements OnInit, OnDestroy, AfterViewInit {
    state = State.INIT;

    private readonly BUILDER_IO_ENTRY_KEY = "header";

    private readonly JAVASCRIPT_ELEMENT_TYPE = "script";
    private readonly JAVASCRIPT_SCRIPT_TYPE = "text/javascript";

    public apiKey: string;
    public entry: string;

    public loadedBuilderTemplate = false;

    currentUser: User;
    searchControl: FormControl;
    private subscription = new Subject();

    autoCompleteResult: AutoCompleteResult;

    constructor(
        private matDialog: MatDialog,
        private dialog: DialogService,
        private router: Router,
        private route: ActivatedRoute,
        private authenticationService: AuthenticationService,
        private autocomplete: AutoCompleteGQL,
        private builderIOService: BuilderIOService,
        private elementRef: ElementRef
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

    public ngAfterViewInit(): void {
        this.loadContent();
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
        this.router.navigate([this.currentUser?.username]);
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

    private loadContent(): void {
        this.loadedBuilderTemplate = false;
        this.builderIOService
            .getBuilderIOApiKey()
            .pipe(takeUntil(this.subscription))
            .subscribe((apiKey) => {
                const entry = this.builderIOService.getTemplateEntryByPageKey(this.BUILDER_IO_ENTRY_KEY);
                if (entry) {
                    this.loadJavascriptAndInjectIntoTemplate(apiKey, entry);
                } else {
                    this.loadedBuilderTemplate = true;
                }
            });
    }

    private loadJavascriptAndInjectIntoTemplate(apiKey: string, entry: string): void {
        this.builderIOService
            .getBuilderIOScript()
            .pipe(takeUntil(this.subscription))
            .subscribe((js) => {
                this.apiKey = apiKey;
                this.entry = entry;
                this.injectJavascriptIntoTemplate(js);
                this.loadedBuilderTemplate = true;
            });
    }

    private injectJavascriptIntoTemplate(js: string): void {
        const script = document.createElement(this.JAVASCRIPT_ELEMENT_TYPE);
        script.type = this.JAVASCRIPT_SCRIPT_TYPE;
        script.innerHTML = js;
        this.elementRef.nativeElement.appendChild(script);
    }
}
