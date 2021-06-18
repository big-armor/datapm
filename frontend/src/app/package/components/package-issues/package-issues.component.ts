import { Component, OnDestroy, OnInit } from "@angular/core";
import { SafeUrl } from "@angular/platform-browser";
import { ActivatedRoute, Router } from "@angular/router";
import { Subject } from "rxjs";
import { ConfirmationDialogService } from "src/app/services/dialog/confirmation-dialog.service";
import { ImageService } from "src/app/services/image.service";
import {
    DeletePackageIssuesGQL,
    OrderBy,
    PackageIdentifierInput,
    PackageIssue,
    PackageIssuesGQL,
    PackageIssueStatus,
    Permission,
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

interface PackageIssueWithMetadata extends PackageIssue {
    checked?: boolean;
    authorDisplayName?: string;
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

    public issues: PackageIssueWithMetadata[] = [];
    public hasMore: boolean = false;
    public loadingMoreIssues: boolean = false;

    public includeOpenIssues: boolean = true;
    public includeClosedIssues: boolean = false;

    public allIssuesSelected: boolean = false;
    public anyIssueSelected: boolean = false;

    public isUserAPackageManager: boolean = false;
    public openIssuesCount: number = 0;
    public closedIssuesCount: number = 0;
    public totalIssuesCount: number = 0;

    private packageIdentifier: PackageIdentifierInput;
    private offset: number;

    constructor(
        private packageIssuesGQL: PackageIssuesGQL,
        private packageService: PackageService,
        private imageService: ImageService,
        private confirmationDialogService: ConfirmationDialogService,
        private updatePackageIssuesStatusesGQL: UpdatePackageIssuesStatusesGQL,
        private deletePackageIssuesGQL: DeletePackageIssuesGQL,
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

    public checkIssue(ev): void {
        ev.stopPropagation();
    }

    public toggleIssue(issue: PackageIssueWithMetadata, value: boolean): void {
        issue.checked = value;
        this.updateSelectionStatuses();
    }

    public goToUserProfile(username: string): void {
        this.router.navigate(["/" + username]);
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

    public deleteSelectedIssues(): void {
        this.confirmationDialogService
            .openFancyConfirmationDialog({
                data: {
                    title: "Delete selected issues",
                    content: "Are you sure you want to delete the selected issues?"
                }
            })
            .subscribe((confirmation) => {
                if (!confirmation) {
                    return;
                }

                const selectedIssues = this.issues.filter((i) => i.checked);
                const selectedIssuesIdentifiers = selectedIssues.map((i) => ({ issueNumber: i.issueNumber }));
                this.deletePackageIssuesGQL
                    .mutate({
                        packageIdentifier: this.packageIdentifier,
                        issuesIdentifiers: selectedIssuesIdentifiers
                    })
                    .subscribe((response) => {
                        if (!response.errors) {
                            // this.reloadIssues();
                            this.packageService.getPackage(
                                this.packageIdentifier.catalogSlug,
                                this.packageIdentifier.packageSlug
                            );
                        }
                    });
            });
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
            const fetchedPackage = packageResponse.package;
            this.packageIdentifier = {
                catalogSlug: fetchedPackage.identifier.catalogSlug,
                packageSlug: fetchedPackage.identifier.packageSlug
            };

            this.isUserAPackageManager = fetchedPackage.myPermissions.includes(Permission.MANAGE);
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
            this.openIssuesCount = responseData.openIssuesCount;
            this.closedIssuesCount = responseData.closedIssuesCount;
            this.totalIssuesCount = this.openIssuesCount + this.closedIssuesCount;
            this.updateState();
        });
    }

    private updateState(): void {
        if (this.issues.length > 0) {
            this.issues.forEach((i) => {
                const author = i.author;
                if (author.firstName && author.lastName) {
                    i.authorDisplayName = `${author.firstName} ${author.lastName}`;
                } else {
                    i.authorDisplayName = author.username;
                }
            });
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
