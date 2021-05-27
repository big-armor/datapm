import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router, NavigationExtras } from "@angular/router";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { PageState } from "src/app/models/page-state";
import { TabModel } from "src/app/models/tab.model";
import { AuthenticationService } from "src/app/services/authentication.service";
import { User, UserGQL } from "src/generated/graphql";

@Component({
    selector: "app-user-details-page",
    templateUrl: "./user-details-page.component.html",
    styleUrls: ["./user-details-page.component.scss"]
})
export class UserDetailsPageComponent implements OnInit {
    public user: User;
    public username: string;
    public state: PageState = "INIT";
    public tabs: TabModel[] = [];
    public selectedTab: string = "";
    public isCurrentUser: boolean = false;

    private subscription = new Subject();

    constructor(
        private userGQL: UserGQL,
        private route: ActivatedRoute,
        private router: Router,
        private authSvc: AuthenticationService
    ) {
        this.username = this.route.snapshot.paramMap.get("catalogSlug");
        if (this.username === this.authSvc.currentUser.value?.username) {
            this.isCurrentUser = true;
            this.tabs = [
                { name: "my account", value: "" },
                { name: "packages", value: "packages" },
                { name: "collections", value: "collections" },
                { name: "catalogs", value: "catalogs" },
                { name: "following", value: "user-following" }
            ];
        } else {
            this.tabs = [
                { name: "packages", value: "" },
                { name: "collections", value: "collections" },
                { name: "catalogs", value: "catalogs" }
            ];
        }

        this.route.fragment.pipe(takeUntil(this.subscription)).subscribe((fragment: string) => {
            const index = this.tabs.findIndex((tab) => tab.value === (fragment || ""));
            if (index < 0) {
                this.selectTab(this.tabs[0].value);
            } else {
                this.selectedTab = fragment || "";
            }
        });
    }

    public ngOnInit(): void {
        if (this.isCurrentUser) {
            this.authSvc.currentUser.pipe(takeUntil(this.subscription)).subscribe((user) => {
                this.user = user;
                this.state = "SUCCESS";
            });
        } else {
            this.userGQL
                .fetch({
                    username: this.username
                })
                .subscribe(({ data, errors }) => {
                    if (errors) {
                        this.state = "ERROR";
                        return;
                    }

                    this.user = data.user;
                    this.state = "SUCCESS";
                });
        }
    }

    ngOnDestroy() {
        this.subscription.next();
        this.subscription.complete();
    }

    public selectTab(tab: string) {
        const extras: NavigationExtras = {
            relativeTo: this.route
        };

        if (tab !== "") extras.fragment = tab;

        this.router.navigate(["."], extras);
    }
}
