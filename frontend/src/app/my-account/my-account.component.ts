import { Component, OnDestroy, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { FormGroup, FormControl } from "@angular/forms";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { AuthenticationService } from "../services/authentication.service";
import { APIKey, Catalog, User } from "src/generated/graphql";
import { EditAccountDialogComponent } from "./edit-account-dialog/edit-account-dialog.component";
import { take, takeUntil } from "rxjs/operators";
import { Subject } from "rxjs";

enum State {
    INIT,
    LOADING,
    ERROR,
    SUCCESS,
    ERROR_NOT_UNIQUE
}
@Component({
    selector: "app-my-account",
    templateUrl: "./my-account.component.html",
    styleUrls: ["./my-account.component.scss"]
})
export class MyAccountComponent implements OnInit, OnDestroy {
    State = State;
    state = State.INIT;

    catalogState = State.INIT;
    apiKeysState = State.INIT;
    createAPIKeyState = State.INIT;
    deleteAPIKeyState = State.INIT;

    currentUser: User;
    newAPIKey: string;

    public myCatalogs: Catalog[];
    public myAPIKeys: APIKey[];
    public routes = [];
    public selectedTab = 0;

    createAPIKeyForm: FormGroup;

    private subscription = new Subject();

    constructor(
        private authenticationService: AuthenticationService,
        private router: Router,
        public dialog: MatDialog
    ) {
        let prefix = "/me";
        this.routes = [
            { linkName: "My Account", url: prefix },
            { linkName: "My Packages", url: prefix + "/packages" },
            { linkName: "My Collections", url: prefix + "/collections" },
            { linkName: "My Catalogs", url: prefix + "/catalogs" }
        ];
    }

    ngOnInit(): void {
        this.selectTab(0);
        this.state = State.INIT;

        this.createAPIKeyForm = new FormGroup({
            label: new FormControl("")
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
    }

    ngOnDestroy() {
        this.subscription.unsubscribe();
    }

    public selectTab(index) {
        this.router.navigate([this.routes[index].url]);
        this.selectedTab = index;
    }

    logoutClicked() {
        this.authenticationService.logout();
        this.router.navigate(["/"]);
    }
}
