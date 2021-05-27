import { Component, Input, OnChanges, OnInit, SimpleChanges } from "@angular/core";
import { ActivatedRoute, Router, NavigationExtras } from "@angular/router";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { PageState } from "src/app/models/page-state";
import { TabModel } from "src/app/models/tab.model";
import { AuthenticationService } from "src/app/services/authentication.service";
import { User } from "src/generated/graphql";

@Component({
    selector: "app-user-details-page",
    templateUrl: "./user-details-page.component.html",
    styleUrls: ["./user-details-page.component.scss"]
})
export class UserDetailsPageComponent implements OnChanges {
    @Input()
    public user: User;
    public username: string;
    public isCurrentUser: boolean = false;

    public state: PageState = "INIT";

    public tabs: TabModel[] = [];
    public selectedTab: string = "";

    private readonly subscription = new Subject();

    constructor(private route: ActivatedRoute, private router: Router, private authSvc: AuthenticationService) {
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

    public ngOnChanges(changes: SimpleChanges): void {
        if (changes.user.currentValue) {
            this.state = "SUCCESS";
        }
    }

    public ngOnDestroy(): void {
        this.subscription.next();
        this.subscription.complete();
    }

    public selectTab(tab: string): void {
        const extras: NavigationExtras = {
            relativeTo: this.route
        };

        if (tab !== "") {
            extras.fragment = tab;
        }

        this.router.navigate(["."], extras);
    }
}
