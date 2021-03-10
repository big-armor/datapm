import { Component, OnDestroy, OnInit } from "@angular/core";
import { SafeUrl } from "@angular/platform-browser";
import { ActivatedRoute, Router } from "@angular/router";
import { Subject } from "rxjs";
import { ImageService } from "src/app/services/image.service";
import { OrderBy, PackageIdentifierInput, PackageIssue, PackageIssuesGQL } from "src/generated/graphql";
import { PackageService } from "../../services/package.service";

enum State {
    INIT,
    SUCCESS,
    LOADING,
    LOADING_MORE_ISSUES,
    NO_ISSUES,
    NO_OPEN_ISSUES,
    NO_CLOSED_ISSUES,
    OPEN_ISSUES,
    CLOSED_ISSUES
}

@Component({
    selector: "app-package-issues",
    templateUrl: "./package-issues.component.html",
    styleUrls: ["./package-issues.component.scss"]
})
export class PackageIssuesComponent implements OnInit, OnDestroy {
    public readonly State = State;

    private readonly ISSUES_PER_PAGE_COUNT = 10;
    private readonly onDestory = new Subject();

    public state: State = State.INIT;

    public issues: PackageIssue[] = [];
    public hasMore: boolean = false;
    public loading: boolean = false;

    public includeOpenIssues: boolean = true;
    public includeClosedIssues: boolean = false;

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

    public toggleIncludeOpenIssues(): void {
        this.includeOpenIssues = true;
        this.includeClosedIssues = false;
        this.loadPackageIssues(true);
    }

    public toggleIncludeClosedIssues(): void {
        this.includeClosedIssues = true;
        this.includeOpenIssues = false;
        this.loadPackageIssues(true);
    }

    public toggleIncludeAllIssues(): void {
        this.includeOpenIssues = true;
        this.includeClosedIssues = true;
        this.loadPackageIssues(true);
    }

    private loadPackage(): void {
        this.state = State.LOADING;
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
        this.state = resetCollection ? State.LOADING : State.LOADING_MORE_ISSUES;

        const variables = {
            packageIdentifier: this.packageIdentifier,
            includeOpenIssues: this.includeOpenIssues,
            includeClosedIssues: this.includeClosedIssues,
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
            this.updateState();
        });
    }

    private updateState(): void {
        if (this.issues.length > 0) {
            this.state = State.SUCCESS;
            return;
        }

        if (this.includeOpenIssues && this.includeClosedIssues) {
            this.state = State.NO_ISSUES;
        } else if (this.includeOpenIssues && !this.includeClosedIssues) {
            this.state = State.NO_OPEN_ISSUES;
        } else if (!this.includeOpenIssues && this.includeClosedIssues) {
            this.state = State.NO_CLOSED_ISSUES;
        }
    }
}
