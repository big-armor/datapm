import { Component, OnDestroy, OnInit } from "@angular/core";
import { SafeUrl } from "@angular/platform-browser";
import { ActivatedRoute, Router } from "@angular/router";
import { Subject } from "rxjs";
import { ImageService } from "src/app/services/image.service";
import {
    OrderBy,
    Package,
    PackageIdentifier,
    PackageIdentifierInput,
    PackageIssue,
    PackageIssuesGQL
} from "src/generated/graphql";
import { PackageService } from "../../services/package.service";

@Component({
    selector: "app-package-issues",
    templateUrl: "./package-issues.component.html",
    styleUrls: ["./package-issues.component.scss"]
})
export class PackageIssuesComponent implements OnInit, OnDestroy {
    private readonly ISSUES_PER_PAGE_COUNT = 10;
    private readonly onDestory = new Subject();

    public issues: PackageIssue[] = [];
    public hasMore: boolean = false;
    public loading: boolean = false;

    public rren: boolean = false;

    private packageIdentifier: PackageIdentifierInput;
    private offset: number;

    constructor(
        private packageIssuesGQL: PackageIssuesGQL,
        private packageService: PackageService,
        private imageService: ImageService,
        private router: Router,
        private route: ActivatedRoute
    ) {}

    public ngOnInit(): void {
        this.loadPackage();
    }

    public ngOnDestroy(): void {
        this.onDestory.next();
        this.onDestory.complete();
    }

    public loadMoreIssues(): void {
        this.loadPackageIssues();
    }

    public navigateToNewIssuePage(): void {
        this.router.navigate(["new"], { relativeTo: this.route });
    }

    public getUserAvatar(username: string): Subject<SafeUrl> {
        return this.imageService.loadUserAvatar(username);
    }

    private loadPackage(): void {
        this.packageService.package.subscribe((packageResponse) => {
            this.packageIdentifier = {
                catalogSlug: packageResponse.package.identifier.catalogSlug,
                packageSlug: packageResponse.package.identifier.packageSlug
            };
            this.offset = 0;
            this.loadPackageIssues(true);
        });
    }

    private loadPackageIssues(resetCollection: boolean = false): void {
        const variables = {
            packageIdentifier: this.packageIdentifier,
            offset: this.offset,
            limit: this.ISSUES_PER_PAGE_COUNT,
            orderBy: OrderBy.UPDATED_AT
        };

        this.packageIssuesGQL.fetch(variables).subscribe((issuesResponse) => {
            if (issuesResponse.error) {
                this.loading = false;
                return;
            }

            const responseData = issuesResponse.data.packageIssues;
            this.hasMore = responseData.hasMore;
            if (resetCollection) {
                this.issues = responseData.issues;
            } else {
                this.issues.push(...responseData.issues);
            }
        });
    }
}
