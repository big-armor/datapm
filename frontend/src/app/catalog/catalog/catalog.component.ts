import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, ParamMap } from "@angular/router";
import { Subject, Subscription } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { PlatformSettingsComponent } from "src/app/home/admin-dashboard/platform-settings/platform-settings.component";
import { PageState } from "src/app/models/page-state";
import { AuthenticationService } from "src/app/services/authentication.service";
import { Catalog, CurrentUser, GetPageContentGQL, PageContent, Permission, User } from "src/generated/graphql";

enum PageType {
    USER,
    CATALOG,
    BUILDER_IO_TEMPLATE,
    UNKNOWN
}

@Component({
    selector: "app-catalog",
    templateUrl: "./catalog.component.html",
    styleUrls: ["./catalog.component.scss"]
})
export class CatalogComponent implements OnInit {
    public readonly NOT_FOUND_BUILDER_IO_ENTRY_KEY = PlatformSettingsComponent.NOT_FOUND_PAGE_ENTRY_KEY;

    public PageType = PageType;
    public pageType: PageType;

    public state: PageState = "INIT";

    public user: User;
    public currentUser: CurrentUser;
    public currentUserSubscription: Subscription;

    public catalog: Catalog;

    public builderIOApiKey: string;
    public builderIOPageEntry: string;

    private subscription = new Subject();

    constructor(
        private route: ActivatedRoute,
        private pageContentGQL: GetPageContentGQL,
        private authService: AuthenticationService
    ) {
        this.currentUserSubscription = this.authService.currentUser.subscribe((user) => {
            this.currentUser = user;

            if (this.currentUser && this.currentUser?.user.username == this.user?.username) {
                this.user = this.currentUser.user;
            }
        });
    }

    public ngOnInit(): void {
        this.route.paramMap.pipe(takeUntil(this.subscription)).subscribe((paramMap: ParamMap) => {
            this.reloadData();
        });
    }

    private reloadData(): void {
        const paramMap = this.route.snapshot.paramMap;
        const catalogSlug = paramMap.get("catalogSlug");
        this.state = "LOADING";

        this.loadData(catalogSlug);
    }

    public ngOnDestroy(): void {
        this.subscription.next();
        this.subscription.complete();

        this.currentUserSubscription.unsubscribe();
    }

    private loadData(route: string): void {
        this.pageContentGQL.fetch({ route }).subscribe(
            (response) => {
                const data = response.data;
                if (!data) {
                    this.pageType = PageType.UNKNOWN;
                    this.state = "ERROR";
                    return;
                }

                this.updatePageType(route, data.pageContent);
                this.state = "SUCCESS";
            },
            () => (this.state = "ERROR")
        );
    }

    public updateCatalog(catalog: Catalog): void {
        this.catalog = catalog;
    }

    private updatePageType(route: string, content: PageContent): void {
        if (content.user) {
            this.updateUserSettings(content);
        } else if (content.catalog) {
            this.updateCatalogSettings(content);
        } else if (content.builderIOPage) {
            this.updateTemplateSettings(route, content);
        } else {
            this.pageType = PageType.UNKNOWN;
        }
    }

    private updateUserSettings(content: any): void {
        this.user = content.user;
        this.pageType = PageType.USER;
    }

    private updateCatalogSettings(content: any): void {
        this.catalog = content.catalog;

        if (!this.catalog.myPermissions.includes(Permission.VIEW)) {
            this.pageType = PageType.CATALOG;
        } else {
            this.pageType = PageType.CATALOG;
        }
    }

    private updateTemplateSettings(route: string, content: PageContent): void {
        const settings = content.builderIOPage;
        this.builderIOApiKey = settings.apiKey;
        if (!settings.template) {
            this.pageType = PageType.UNKNOWN;
            return;
        }

        this.builderIOPageEntry = settings.template.entry;
        this.pageType = PageType.BUILDER_IO_TEMPLATE;
    }
}
