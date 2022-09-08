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
export class UserDetailsPageComponent implements OnChanges, OnInit {
    @Input()
    public user: User;
    public username: string;
    public isCurrentUser: boolean = false;

    public state: PageState = "INIT";

    public tabs: TabModel[] = [];
    public currentTab: string = "";

    private readonly subscription = new Subject();

    constructor(private route: ActivatedRoute, private router: Router, private authSvc: AuthenticationService) {
        this.username = this.route.snapshot.paramMap.get("catalogSlug");
        if (this.username === this.authSvc.currentUser.value?.user.username) {
            this.isCurrentUser = true;
            this.tabs = [
                { name: "my account", value: "" },
                { name: "packages", value: "packages" },
                { name: "collections", value: "collections" },
                { name: "catalogs", value: "catalogs" },
                { name: "following", value: "following" },
                { name: "groups", value: "groups" }
            ];
        } else {
            this.tabs = [
                { name: "packages", value: "" },
                { name: "collections", value: "collections" },
                { name: "catalogs", value: "catalogs" }
            ];
        }
    }

    public ngOnInit(): void {
        this.route.fragment.pipe(takeUntil(this.subscription)).subscribe((fragment: string) => {
            const tab = this.tabs.find((tab) => tab.value === fragment);
            if (!tab) {
                this.currentTab = "";
                this.updateTabParam();
            } else {
                this.currentTab = tab.value;
                this.updateTabParam();
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
        this.currentTab = tab;
        this.updateTabParam();
    }

    public updateTabParam() {
        const extras: NavigationExtras = {
            relativeTo: this.route,
            queryParamsHandling: "preserve"
        };

        if (this.currentTab !== "") {
            extras.fragment = this.currentTab;
        }

        this.router.navigate(["."], extras);
    }
}
