import { I } from "@angular/cdk/keycodes";
import { Component, OnDestroy, OnInit } from "@angular/core";
import { SafeUrl } from "@angular/platform-browser";
import { ActivatedRoute, Router } from "@angular/router";
import { Subject } from "rxjs";
import { ImageService } from "src/app/services/image.service";
import {
    OrderBy,
    PackageIdentifierInput,
    PackageIssue,
    PackageIssuesGQL,
    PackageIssueStatus,
    UpdatePackageIssuesStatusesGQL
} from "src/generated/graphql";
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

interface PackageIssueWithCheckedState extends PackageIssue {
    checked?: boolean;
}

@Component({
    selector: "app-package-issues",
    templateUrl: "./package-issues.component.html",
    styleUrls: ["./package-issues.component.scss"]
})
export class PackageIssuesComponent implements OnInit, OnDestroy {
    public readonly State = State;

    private readonly ISSUES_PER_PAGE_COUNT = 20;
    private readonly onDestory = new Subject();

    public state: State = State.INIT;

    public issues: PackageIssueWithCheckedState[] = [];
    public hasMore: boolean = false;
    public loadingMoreIssues: boolean = false;

    public includeOpenIssues: boolean = true;
    public includeClosedIssues: boolean = false;

    public allIssuesSelected: boolean = false;
    public anyIssueSelected: boolean = false;

    private packageIdentifier: PackageIdentifierInput;
    private offset: number;

    constructor(
        private packageIssuesGQL: PackageIssuesGQL,
        private packageService: PackageService,
        private imageService: ImageService,
        private updatePackageIssuesStatusesGQL: UpdatePackageIssuesStatusesGQL,
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

    public reloadIssues(): void {
        this.loadPackageIssues(true);
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

    public toggleAllIssuesSelection(selected: boolean): void {
        this.issues.forEach((i) => (i.checked = selected));
        this.updateSelectionStatuses();
    }

    public toggleIssue(issue: PackageIssueWithCheckedState, value: boolean): void {
        issue.checked = value;
        this.updateSelectionStatuses();
    }

    private updateSelectionStatuses(): void {
        if (this.issues.length === 0) {
            this.anyIssueSelected = false;
            this.allIssuesSelected = false;
        } else {
            this.anyIssueSelected = this.issues.some((i) => i.checked);
            this.allIssuesSelected = this.issues.every((i) => i.checked);
        }
    }

    public openSelectedIssues(): void {
        this.updateStatusesForSelectedIssues(PackageIssueStatus.OPEN);
    }

    public closeSelectedIssues(): void {
        this.updateStatusesForSelectedIssues(PackageIssueStatus.CLOSED);
    }

    private updateStatusesForSelectedIssues(status: PackageIssueStatus): void {
        const selectedIssues = this.issues.filter((i) => i.checked);
        const selectedIssuesIdentifiers = selectedIssues.map((i) => ({ issueNumber: i.issueNumber }));
        this.updatePackageIssuesStatusesGQL
            .mutate({
                packageIdentifier: this.packageIdentifier,
                issuesIdentifiers: selectedIssuesIdentifiers,
                status: { status }
            })
            .subscribe((response) => {
                if (!response.errors) {
                    this.reloadIssues();
                }
            });
    }

    private loadPackage(): void {
        this.state = State.LOADING;
        this.packageService.package.subscribe((packageResponse) => {
            this.packageIdentifier = {
                catalogSlug: packageResponse.package.identifier.catalogSlug,
                packageSlug: packageResponse.package.identifier.packageSlug
            };
            this.offset = 0;
            this.reloadIssues();
        });
    }

    private loadPackageIssues(resetCollection: boolean = false): void {
        if (resetCollection) {
            this.state = State.LOADING;
        } else {
            this.loadingMoreIssues = true;
        }

        const variables = {
            packageIdentifier: this.packageIdentifier,
            includeOpenIssues: this.includeOpenIssues,
            includeClosedIssues: this.includeClosedIssues,
            offset: resetCollection ? 0 : this.offset,
            limit: this.ISSUES_PER_PAGE_COUNT,
            orderBy: OrderBy.UPDATED_AT
        };

        this.packageIssuesGQL.fetch(variables).subscribe((issuesResponse) => {
            this.loadingMoreIssues = false;
            if (issuesResponse.error) {
                return;
            }

            this.allIssuesSelected = false;
            const responseData = issuesResponse.data.packageIssues;
            this.hasMore = responseData.hasMore;
            if (resetCollection) {
                this.issues = responseData.issues;
            } else {
                this.issues.push(...responseData.issues);
            }
            this.offset = this.issues.length;
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
