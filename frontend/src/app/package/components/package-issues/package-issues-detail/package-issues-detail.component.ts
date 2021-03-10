import { Component, OnInit } from "@angular/core";
import { SafeUrl } from "@angular/platform-browser";
import { ActivatedRoute, Router } from "@angular/router";
import { Subject } from "rxjs";
import { PackageService } from "src/app/package/services/package.service";
import { ConfirmationDialogService } from "src/app/services/dialog/confirmation-dialog.service";
import { ImageService } from "src/app/services/image.service";
import {
    CreatePackageIssueCommentGQL,
    DeletePackageIssueGQL,
    OrderBy,
    PackageIdentifierInput,
    PackageIssue,
    PackageIssueComment,
    PackageIssueCommentsGQL,
    PackageIssueGQL,
    PackageIssueIdentifierInput
} from "src/generated/graphql";

enum State {
    INIT,
    SUCCESS,
    LOADING
}

interface PackageIssueCommentWithEditorStatus extends PackageIssueComment {
    editedContent?: string;
    isEditing?: boolean;
    errorMessage?: string;
}

@Component({
    selector: "app-package-issues-detail",
    templateUrl: "./package-issues-detail.component.html",
    styleUrls: ["./package-issues-detail.component.scss"]
})
export class PackageIssuesDetailComponent implements OnInit {
    public readonly State = State;
    private readonly COMMENTS_TO_LOAD_PER_PAGE = 1;

    public state: State = State.INIT;
    public packageIssue: PackageIssue;
    public packageIssueNewContent: string;
    public editingIssue: boolean = false;
    public editingIssueErrorMessage: string;

    public packageIssueComments: PackageIssueCommentWithEditorStatus[] = [];
    public hasMoreComments = false;
    public newCommentContent: string = "";
    public submittingNewComment = false;
    public loadingMoreComments = false;

    public packageIdentifier: PackageIdentifierInput;
    public issueIdentifier: PackageIssueIdentifierInput;

    public errorMessage: string;

    private commentsOffset = 0;

    constructor(
        private packageService: PackageService,
        private packageIssueGQL: PackageIssueGQL,
        private deletePackageIssueGQL: DeletePackageIssueGQL,
        private packageIssueCommentsGQL: PackageIssueCommentsGQL,
        private createPackageIssueCommentGQL: CreatePackageIssueCommentGQL,
        private imageService: ImageService,
        private confirmationDialogService: ConfirmationDialogService,
        private router: Router,
        private route: ActivatedRoute
    ) {}

    public ngOnInit(): void {
        const issueNumber = this.route.snapshot.params.issueNumber;
        if (issueNumber) {
            this.issueIdentifier = { issueNumber: issueNumber };
            this.loadPackage();
        } else {
            this.errorMessage = "Invalid issue number";
        }
    }

    public updateIssue(): void {
        if (!this.isValidContent(this.packageIssueNewContent)) {
            this.editingIssueErrorMessage = "Invalid issue content";
            return;
        }

        // TODO: Make HTTP request here to update the issue content
        this.closeIssueEditor();
    }

    public openIssueEditor(): void {
        this.editingIssueErrorMessage = null;
        this.packageIssueNewContent = this.packageIssue.content;
        this.editingIssue = true;
    }

    public closeIssueEditor(): void {
        this.editingIssue = false;
    }

    public updateComment(comment: PackageIssueCommentWithEditorStatus): void {
        if (!this.isValidContent(comment.editedContent) || comment.editedContent.trim() != comment.content.trim()) {
            comment.errorMessage = "Invalid comment";
            return;
        }

        comment.content = comment.editedContent;
        // TODO: Make HTTP request here to update the comment content
        this.closeCommentEditor(comment);
    }

    public openCommentEditor(comment: PackageIssueCommentWithEditorStatus): void {
        comment.errorMessage = null;
        comment.editedContent = comment.content;
        comment.isEditing = true;
    }

    public closeCommentEditor(comment: PackageIssueCommentWithEditorStatus): void {
        comment.isEditing = false;
    }

    public deleteIssue(): void {
        this.confirmationDialogService
            .openFancyConfirmationDialog({
                data: {
                    title: "Delete issue",
                    content: "Are you sure you want to delete this issue?"
                }
            })
            .subscribe((confirmation) => {
                if (confirmation) {
                    this.deletePackageIssueGQL
                        .mutate({
                            packageIdentifier: this.packageIdentifier,
                            packageIssueIdentifier: { issueNumber: this.packageIssue.issueNumber }
                        })
                        .subscribe((response) => {
                            if (!response.errors) {
                                this.router.navigate(["../"], { relativeTo: this.route });
                            }
                        });
                }
            });
    }

    public loadPackageIssueComments(reload = false): void {
        if (this.loadingMoreComments) {
            return;
        }

        this.loadingMoreComments = true;
        this.packageIssueCommentsGQL
            .fetch({
                issueIdentifier: this.issueIdentifier,
                packageIdentifier: this.packageIdentifier,
                offset: reload ? 0 : this.commentsOffset,
                limit: this.COMMENTS_TO_LOAD_PER_PAGE,
                orderBy: OrderBy.CREATED_AT
            })
            .subscribe((commentsResponse) => {
                this.loadingMoreComments = false;
                if (commentsResponse.errors) {
                    return;
                }

                if (reload) {
                    this.packageIssueComments = commentsResponse.data.packageIssueComments.comments;
                } else {
                    this.packageIssueComments.push(...commentsResponse.data.packageIssueComments.comments);
                }

                this.commentsOffset = this.packageIssueComments.length;
                this.hasMoreComments = commentsResponse.data.packageIssueComments.hasMore;
                this.state = State.SUCCESS;
            });
    }

    public createNewComment(): void {
        if (!this.isValidNewCommentContent()) {
            return;
        }

        this.submittingNewComment = true;
        this.createPackageIssueCommentGQL
            .mutate({
                packageIdentifier: this.packageIdentifier,
                issueIdentifier: this.issueIdentifier,
                comment: {
                    content: this.newCommentContent
                }
            })
            .subscribe(
                () => {
                    this.submittingNewComment = false;
                    this.newCommentContent = "";
                    this.loadPackageIssueComments(true);
                },
                () => (this.submittingNewComment = false)
            );
    }

    public isValidNewCommentContent(): boolean {
        return this.isValidContent(this.newCommentContent);
    }

    public getUserAvatar(username: string): Subject<SafeUrl> {
        return this.imageService.loadUserAvatar(username);
    }

    private isValidContent(content: string): boolean {
        return content && content.trim().length > 0;
    }

    private loadPackage(): void {
        this.state = State.LOADING;
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
