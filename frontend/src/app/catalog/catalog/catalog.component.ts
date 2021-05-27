import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, ParamMap } from "@angular/router";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { PlatformSettingsComponent } from "src/app/home/admin-dashboard/platform-settings/platform-settings.component";
import { PageState } from "src/app/models/page-state";
import { BuilderIOSettings, Catalog, GetPageContentGQL, User } from "src/generated/graphql";

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
    public currentUser: User;

    public catalog: Catalog;

    public builderIOApiKey: string;
    public builderIOPageEntry: string;

    private subscription = new Subject();

    constructor(private route: ActivatedRoute, private pageContentGQL: GetPageContentGQL) {}

    public ngOnInit(): void {
        this.route.paramMap.pipe(takeUntil(this.subscription)).subscribe((paramMap: ParamMap) => {
            const catalogSlug = paramMap.get("catalogSlug");
            this.state = "LOADING";
            this.loadData(catalogSlug);
        });
    }

    public ngOnDestroy(): void {
        this.subscription.next();
        this.subscription.complete();
    }

    private loadData(route: string): void {
        this.pageContentGQL.fetch({ route }).subscribe(
            (response) => {
                const data = response.data;
                if (!data) {
                    this.pageType = PageType.UNKNOWN;
                    return;
                }

                this.updatePageType(route, data.pageContent);
                this.state = PageType.UNKNOWN === this.pageType ? "ERROR" : "SUCCESS";
            },
            () => (this.state = "ERROR")
        );
    }

    private updatePageType(route: string, content: any): void {
        if (content.user) {
            this.updateUserSettings(content);
        } else if (content.catalog) {
            this.updateCatalogSettings(content);
        } else if (content.builderIOSettings) {
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
        this.pageType = PageType.CATALOG;
    }

    private updateTemplateSettings(route: string, content: any): void {
        const settings: BuilderIOSettings = content.builderIOSettings;
        this.builderIOApiKey = settings.apiKey;
        const template = settings.templates.find((t) => t.key === route);
        if (!template) {
            this.pageType = PageType.UNKNOWN;
            return;
        }

        this.builderIOPageEntry = template.entry;
        this.pageType = PageType.BUILDER_IO_TEMPLATE;
    }
}
