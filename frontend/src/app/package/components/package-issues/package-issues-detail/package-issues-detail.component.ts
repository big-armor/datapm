import { Component, OnInit } from "@angular/core";
import { SafeUrl } from "@angular/platform-browser";
import { ActivatedRoute } from "@angular/router";
import { Subject } from "rxjs";
import { PackageService } from "src/app/package/services/package.service";
import { ImageService } from "src/app/services/image.service";
import { CreatePackageIssueCommentGQL, OrderBy, PackageIdentifierInput, PackageIssue, PackageIssueComment, PackageIssueCommentsGQL, PackageIssueGQL, PackageIssueIdentifierInput } from "src/generated/graphql";

@Component({
    selector: "app-package-issues-detail",
    templateUrl: "./package-issues-detail.component.html",
    styleUrls: ["./package-issues-detail.component.scss"]
})
export class PackageIssuesDetailComponent implements OnInit {

    private readonly COMMENTS_TO_LOAD_PER_PAGE = 10;

    public packageIssue: PackageIssue;

    public packageIssueComments: PackageIssueComment[] = [];
    public hasMoreComments = false;
    public newCommentContent: string = "";
    public submittingNewComment = false;

    public packageIdentifier: PackageIdentifierInput;
    public issueIdentifier: PackageIssueIdentifierInput;

    public errorMessage: string;

    private commentsOffset = 0;

    constructor(
        private packageService: PackageService,
        private packageIssueGQL: PackageIssueGQL,
        private packageIssueCommentsGQL: PackageIssueCommentsGQL,
        private createPackageIssueCommentGQL: CreatePackageIssueCommentGQL,
        private imageService: ImageService,
        private route: ActivatedRoute
    ) { }

    public ngOnInit(): void {
        const issueNumber = this.route.snapshot.params.issueNumber;
        if (issueNumber) {
            this.issueIdentifier = { issueNumber: issueNumber };
            this.loadPackage();
        } else {
            this.errorMessage = "Invalid issue number";
        }
    }

    public deleteIssue(): void {
        console.log("hhehe");
    }

    public loadPackageIssueComments(reload = false): void {
        this.packageIssueCommentsGQL.fetch({
            issueIdentifier: this.issueIdentifier,
            packageIdentifier: this.packageIdentifier,
            offset: reload ? 0 : this.commentsOffset,
            limit: this.COMMENTS_TO_LOAD_PER_PAGE,
            orderBy: OrderBy.CREATED_AT
        }).subscribe((commentsResponse) => {
            if (commentsResponse.errors) {
                return;
            }

            this.packageIssueComments = commentsResponse.data.packageIssueComments.comments;
            this.commentsOffset == this.packageIssueComments.length;
            this.hasMoreComments = commentsResponse.data.packageIssueComments.hasMore;
        });
    }

    public createNewComment(): void {
        if (!this.isValidNewCommentContent()) {
            return;
        }

        this.submittingNewComment = true;
        this.createPackageIssueCommentGQL.mutate({
            packageIdentifier: this.packageIdentifier,
            issueIdentifier: this.issueIdentifier,
            comment: {
                content: this.newCommentContent
            }
        }).subscribe((response) => {
            this.submittingNewComment = false;
            this.newCommentContent = "";
            this.loadPackageIssueComments(true);
        }, () => this.submittingNewComment = false)
    }

    public isValidNewCommentContent(): boolean {
        return this.newCommentContent.trim().length > 0;
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
            this.loadPackageIssue();
        });
    }

    private loadPackageIssue(): void {
        this.packageIssueGQL
            .fetch({
                packageIdentifier: this.packageIdentifier,
                packageIssueIdentifier: this.issueIdentifier
            })
            .subscribe((response) => {
                if (response.errors) {
                    if (response.errors[0].message.includes("ISSUE_NOT_FOUND")) {
                        this.errorMessage = "Issue not found";
                    }
                    return;
                }

                this.packageIssue = response.data.packageIssue;
                this.loadPackageIssueComments();
            });
    }
}
