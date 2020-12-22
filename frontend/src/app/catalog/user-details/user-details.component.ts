import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { PageState } from "src/app/models/page-state";
import { TabModel } from "src/app/models/tab.model";
import { User, UserGQL } from "src/generated/graphql";

@Component({
    selector: "app-user-details",
    templateUrl: "./user-details.component.html",
    styleUrls: ["./user-details.component.scss"]
})
export class UserDetailsComponent implements OnInit {
    public user: User;
    public username: string;
    public state: PageState = "INIT";
    public tabs: TabModel[] = [];
    public selectedTab: string = "";

    private subscription = new Subject();

    constructor(private userGQL: UserGQL, private route: ActivatedRoute, private router: Router) {
        this.tabs = [
            { name: "Packages", value: "" },
            { name: "Collections", value: "collections" },
            { name: "Catalogs", value: "catalogs" }
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
        this.username = this.route.snapshot.paramMap.get("catalogSlug");
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
}
