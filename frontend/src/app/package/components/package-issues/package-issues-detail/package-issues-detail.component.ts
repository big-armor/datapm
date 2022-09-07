import { Component, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { MatDialog, MatDialogRef } from "@angular/material/dialog";
import { SafeUrl } from "@angular/platform-browser";
import { ActivatedRoute, Router } from "@angular/router";
import { combineLatest, Subject } from "rxjs";
import { skip, take, takeUntil } from "rxjs/operators";
import { PackageService } from "src/app/package/services/package.service";
import { AuthenticationService } from "src/app/services/authentication.service";
import { ConfirmationDialogService } from "src/app/services/dialog/confirmation-dialog.service";
import { DialogService } from "src/app/services/dialog/dialog.service";
import { ImageService } from "src/app/services/image.service";
import {
    FollowDialogComponent,
    FollowDialogData,
    FollowDialogResult
} from "src/app/shared/dialogs/follow-dialog/follow-dialog.component";
import { MarkdownEditorComponent } from "src/app/shared/markdown-editor/markdown-editor.component";
import {
    CreatePackageIssueCommentGQL,
    CurrentUser,
    DeletePackageIssueCommentGQL,
    DeletePackageIssueGQL,
    Follow,
    FollowIdentifierInput,
    GetFollowGQL,
    OrderBy,
    PackageIdentifierInput,
    PackageIssue,
    PackageIssueComment,
    PackageIssueCommentsGQL,
    PackageIssueGQL,
    PackageIssueIdentifierInput,
    PackageIssueStatus,
    Permission,
    UpdatePackageIssueCommentGQL,
    UpdatePackageIssueGQL,
    UpdatePackageIssueStatusGQL,
    User
} from "src/generated/graphql";

enum State {
    INIT,
    SUCCESS,
    LOADING
}

interface PackageIssueWithMetadata extends PackageIssue {
    authorDisplayName?: string;
}

interface PackageIssueCommentWithEditorStatus extends PackageIssueComment {
    editedContent?: string;
    isEditing?: boolean;
    isSubmittingEdit?: boolean;
    errorMessage?: string;
    authorDisplayName?: string;
}

@Component({
    selector: "app-package-issues-detail",
    templateUrl: "./package-issues-detail.component.html",
    styleUrls: ["./package-issues-detail.component.scss"]
})
export class PackageIssuesDetailComponent implements OnInit, OnDestroy {
    public readonly State = State;
    private readonly COMMENTS_TO_LOAD_PER_PAGE = 100;

    @ViewChild("newCommentEditor")
    private newCommentEditor: MarkdownEditorComponent;

    public state: State = State.INIT;
    public packageIssue: PackageIssueWithMetadata;
    public packageIssueEditedContent: string;
    public submittingPackageIssueUpdate: boolean = false;
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

    public isUserPackageManager: boolean = false;
    public canEditIssue: boolean = false;

    public issueFollow: Follow;
    public isFollowing: boolean;

    public user: User;
    private commentsOffset = 0;

    public currentUser: CurrentUser;
    private unsubscribe$ = new Subject();

    constructor(
        private authenticationService: AuthenticationService,
        private packageService: PackageService,
        private packageIssueGQL: PackageIssueGQL,
        private updatePackageIssueGQL: UpdatePackageIssueGQL,
        private updatePackageIssueStatusGQL: UpdatePackageIssueStatusGQL,
        private deletePackageIssueGQL: DeletePackageIssueGQL,
        private deletePackageIssueCommentGQL: DeletePackageIssueCommentGQL,
        private packageIssueCommentsGQL: PackageIssueCommentsGQL,
        private createPackageIssueCommentGQL: CreatePackageIssueCommentGQL,
        private updatePackageIssueCommentGQL: UpdatePackageIssueCommentGQL,
        private imageService: ImageService,
        private confirmationDialogService: ConfirmationDialogService,
        private router: Router,
        private route: ActivatedRoute,
        private getFollowGQL: GetFollowGQL,
        private dialog: MatDialog,
        private dialogService: DialogService
    ) {}

    public ngOnInit(): void {
        const issueNumber = this.route.snapshot.params.issueNumber;
        if (issueNumber) {
            this.issueIdentifier = { issueNumber: issueNumber };
            this.loadPackage();
        } else {
            this.errorMessage = "Invalid issue number";
        }

        this.authenticationService.currentUser.pipe(takeUntil(this.unsubscribe$)).subscribe((user: CurrentUser) => {
            this.currentUser = user;
        });
    }

    public ngOnDestroy(): void {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }

    public openSignUpDialog(): void {
        this.dialogService.openSignupDialog();
    }

    public openLoginDialog(): void {
        this.dialogService.openLoginDialog();
    }

    public updateIssue(): void {
        if (!this.isIssueUpdatedContentValid()) {
            this.editingIssueErrorMessage = "Invalid issue content";
            return;
        }

        this.submittingPackageIssueUpdate = true;
        this.updatePackageIssueGQL
            .mutate({
                packageIdentifier: this.packageIdentifier,
                issueIdentifier: this.issueIdentifier,
                issue: {
                    subject: this.packageIssue.subject,
                    content: this.packageIssueEditedContent
                }
            })
            .subscribe((response) => {
                if (response.errors) {
                    this.editingIssueErrorMessage = "Could not update issue content";
                    this.submittingPackageIssueUpdate = false;
                    return;
                }

                this.updatePackageIssue(response.data.updatePackageIssue);
                this.closeIssueEditor();
                this.submittingPackageIssueUpdate = false;
            });
    }

    public isIssueUpdatedContentValid(): boolean {
        return this.isValidContent(this.packageIssueEditedContent);
    }

    public openIssueEditor(editor: MarkdownEditorComponent): void {
        this.editingIssueErrorMessage = null;
        this.packageIssueEditedContent = this.packageIssue.content;
        if (editor) {
            editor.setValue(this.packageIssueEditedContent);
        }
        this.editingIssue = true;
    }

    public closeIssueEditor(): void {
        this.editingIssue = false;
    }

    public updateComment(comment: PackageIssueCommentWithEditorStatus): void {
        if (!this.isValidContent(comment.editedContent)) {
            comment.errorMessage = "Invalid comment";
            return;
        }

        comment.errorMessage = null;
        comment.isSubmittingEdit = true;
        this.updatePackageIssueCommentGQL
            .mutate({
                packageIdentifier: this.packageIdentifier,
                issueIdentifier: this.issueIdentifier,
                issueCommentIdentifier: { commentNumber: comment.commentNumber },
                comment: { content: comment.editedContent }
            })
            .subscribe(
                (response) => {
                    if (response.errors) {
                        comment.errorMessage = "There was an error saving this comment";
                        comment.isSubmittingEdit = false;
                        return;
                    }

                    comment.content = response.data.updatePackageIssueComment.content;
                    this.closeCommentEditor(comment);
                    comment.isSubmittingEdit = false;
                },
                () => {
                    comment.errorMessage = "There was an error saving this comment";
                    comment.isSubmittingEdit = false;
                }
            );
    }

    public openCommentEditor(comment: PackageIssueCommentWithEditorStatus, editor: MarkdownEditorComponent): void {
        comment.errorMessage = null;
        comment.editedContent = comment.content;
        comment.isEditing = true;
        if (editor) {
            editor.setValue(comment.editedContent);
        }
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
                                this.packageService.package
                                    .pipe(takeUntil(this.unsubscribe$), skip(1))
                                    .subscribe((pkg) => this.router.navigate(["../"], { relativeTo: this.route }));
                                this.packageService.getPackage(
                                    this.packageIdentifier.catalogSlug,
                                    this.packageIdentifier.packageSlug
                                );
                            }
                        });
                }
            });
    }

    public deleteComment(commentNumber: number): void {
        this.confirmationDialogService
            .openFancyConfirmationDialog({
                data: {
                    title: "Delete comment",
                    content: "Are you sure you want to delete this comment?"
                }
            })
            .subscribe((confirmation) => {
                if (confirmation) {
                    this.deletePackageIssueCommentGQL
                        .mutate({
                            packageIdentifier: this.packageIdentifier,
                            issueIdentifier: { issueNumber: this.packageIssue.issueNumber },
                            issueCommentIdentifier: { commentNumber }
                        })
                        .subscribe((response) => {
                            if (!response.errors) {
                                this.loadPackageIssueComments(true);
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

                this.packageIssueComments.forEach((c) => {
                    c.editedContent = c.content;
                    const author = c.author;
                    if (author.firstName && author.lastName) {
                        c.authorDisplayName = `${author.firstName} ${author.lastName}`;
                    } else {
                        c.authorDisplayName = author.username;
                    }
                });
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
                    this.newCommentEditor.setValue("");
                    this.loadPackageIssueComments(true);
                },
                () => (this.submittingNewComment = false)
            );
    }

    public insertQuote(content: string): void {
        this.newCommentEditor.insertQuote(content);
    }

    public openIssue(): void {
        this.changeIssueStatus(PackageIssueStatus.OPEN);
    }

    public closeIssue(): void {
        this.changeIssueStatus(PackageIssueStatus.CLOSED);
    }

    public isValidNewCommentContent(): boolean {
        return this.isValidContent(this.newCommentContent);
    }

    public getUserAvatar(username: string): Subject<SafeUrl> {
        return this.imageService.loadUserAvatar(username);
    }

    public canEditComment(comment: PackageIssueCommentWithEditorStatus): boolean {
        return this.isUserPackageManager || (this.user && comment.author.username === this.user.username);
    }

    public follow(): void {
        this.openFollowModal()
            .afterClosed()
            .subscribe((result) => {
                if (!result) {
                    return;
                }

                this.updatePackageFollow(result.follow);
            });
    }

    private getFollow(): void {
        this.getFollowGQL
            .fetch({
                follow: this.buildFollowIdentifier()
            })
            .subscribe((response) => this.updatePackageFollow(response.data?.getFollow));
    }

    private openFollowModal(): MatDialogRef<FollowDialogComponent, FollowDialogResult> {
        return this.dialog.open(FollowDialogComponent, {
            width: "500px",
            data: {
                follow: this.issueFollow,
                followIdentifier: this.buildFollowIdentifier()
            } as FollowDialogData
        });
    }

    private buildFollowIdentifier(): FollowIdentifierInput {
        return {
            packageIssue: {
                packageIdentifier: this.packageIdentifier,
                issueNumber: this.packageIssue.issueNumber
            }
        };
    }

    private updatePackageFollow(follow: Follow): void {
        this.issueFollow = follow;
        this.isFollowing = follow != null;
    }

    private changeIssueStatus(status: PackageIssueStatus): void {
        this.updatePackageIssueStatusGQL
            .mutate({
                packageIdentifier: this.packageIdentifier,
                issueIdentifier: this.issueIdentifier,
                status: { status }
            })
            .subscribe((response) => {
                if (response.errors) {
                    return;
                }

                this.updatePackageIssue(response.data.updatePackageIssueStatus);
            });
    }

    private isValidContent(content: string): boolean {
        return content && content.trim().length > 0;
    }

    private loadPackage(): void {
        this.state = State.LOADING;
        combineLatest([this.authenticationService.currentUser, this.packageService.package]).subscribe(
            ([currentUser, packageResponse]) => {
                const fetchedPackage = packageResponse.package;
                this.packageIdentifier = {
                    catalogSlug: fetchedPackage.identifier.catalogSlug,
                    packageSlug: fetchedPackage.identifier.packageSlug
                };

                this.user = currentUser.user;
                this.isUserPackageManager = fetchedPackage.myPermissions.includes(Permission.MANAGE);
                this.loadPackageIssue();
            }
        );
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

                this.updatePackageIssue(response.data.packageIssue);
                this.canEditIssue =
                    this.isUserPackageManager ||
                    (this.user && this.packageIssue.author.username === this.user.username);
                this.packageIssueEditedContent = this.packageIssue.content;
                this.getFollow();
                this.loadPackageIssueComments();
            });
    }

    private updatePackageIssue(issue: PackageIssueWithMetadata): void {
        this.packageIssue = issue;
        const author = this.packageIssue.author;
        if (author.firstName && author.lastName) {
            this.packageIssue.authorDisplayName = `${author.firstName} ${author.lastName}`;
        } else {
            this.packageIssue.authorDisplayName = author.username;
        }
    }
}
