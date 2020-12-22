import { Component, Input, OnDestroy, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { MatDialog } from "@angular/material/dialog";
import { AuthenticationService } from "../../services/authentication.service";
import { TabModel } from "../../models/tab.model";
import { User } from "src/generated/graphql";
import { takeUntil } from "rxjs/operators";
import { Subject } from "rxjs";

@Component({
    selector: "app-my-account",
    templateUrl: "./my-account.component.html",
    styleUrls: ["./my-account.component.scss"]
})
export class MyAccountComponent implements OnInit, OnDestroy {
    @Input() user: User;

    currentUser: User;

    public tabs: TabModel[] = [];
    public selectedTab: string = "";

    private subscription = new Subject();

    constructor(
        private authenticationService: AuthenticationService,
        private router: Router,
        private route: ActivatedRoute,
        public dialog: MatDialog
    ) {
        this.tabs = [
            { name: "My Account", value: "" },
            { name: "My Packages", value: "packages" },
            { name: "My Collections", value: "collections" },
            { name: "My Catalogs", value: "catalogs" }
        ];

        this.route.fragment.pipe(takeUntil(this.subscription)).subscribe((fragment: string) => {
            const index = this.tabs.findIndex((tab) => tab.value === fragment);
            if (index < 0) {
                this.selectTab(this.tabs[0].value);
            } else {
                this.selectedTab = fragment;
            }
        });
    }

    ngOnInit(): void {
        this.authenticationService.currentUser.pipe(takeUntil(this.subscription)).subscribe((user: User) => {
            this.currentUser = user;
        });
    }

    ngOnDestroy() {
        this.subscription.next();
        this.subscription.complete();
    }

    public selectTab(tab: string) {
        this.router.navigate(["."], {
            relativeTo: this.route,
            fragment: tab
        });
    }

    logoutClicked() {
        this.authenticationService.logout();
        this.router.navigate(["/"]);
    }
}
