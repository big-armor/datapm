import { Component, Input, OnChanges, SimpleChanges } from "@angular/core";
import { MatDialog, MatDialogRef } from "@angular/material/dialog";
import { ActivatedRoute, Router } from "@angular/router";
import { Subscription } from "rxjs";
import { AuthenticationService } from "src/app/services/authentication.service";
import { CurrentUser, Follow, FollowIdentifierInput, GetFollowGQL, User } from "src/generated/graphql";
import { FollowDialogComponent, FollowDialogResult } from "../../dialogs/follow-dialog/follow-dialog.component";
import { LoginDialogComponent } from "../../header/login-dialog/login-dialog.component";

@Component({
    selector: "app-user-details-header",
    templateUrl: "./user-details-header.component.html",
    styleUrls: ["./user-details-header.component.scss"]
})
export class UserDetailsHeaderComponent implements OnChanges {
    @Input()
    public user: User;
    public currentUser: CurrentUser;

    private subscription: Subscription;

    public userFollow: Follow;
    public isFollowing: boolean;

    constructor(
        public dialog: MatDialog,
        private authService: AuthenticationService,
        private getFollowGQL: GetFollowGQL,
        private router: Router,
        private route: ActivatedRoute
    ) {
        this.subscription = this.authService.currentUser.subscribe((user: CurrentUser) => {
            this.currentUser = user;
        });
    }

    public ngOnChanges(changes: SimpleChanges): void {
        if (changes.user && this.user && !this.isCurrentUser) {
            this.getFollow();
        }
    }

    public ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    public get isCurrentUser() {
        return this.user && this.currentUser?.user.username === this.user.username;
    }

    public follow(): void {
        const followDialogRef = this.openFollowModal();
        if (followDialogRef) {
            followDialogRef.afterClosed().subscribe((result) => {
                if (!result) {
                    return;
                }

                this.updatePackageFollow(result.follow);
            });
        }
    }

    private getFollow(): void {
        if (!this.currentUser) {
            return;
        }

        this.getFollowGQL
            .fetch({
                follow: this.buildFollowIdentifier()
            })
            .subscribe((response) => {
                this.updatePackageFollow(response.data?.getFollow);
                const shouldOpenFollowModal = this.route.snapshot.queryParamMap.get("following");

                if (shouldOpenFollowModal) {
                    if (!this.isFollowing) {
                        this.follow();
                    }
                    this.router.navigate([], { preserveFragment: true });
                }
            });
    }

    private buildFollowIdentifier(): FollowIdentifierInput {
        return {
            user: {
                username: this.user.username
            }
        };
    }

    private openFollowModal(): MatDialogRef<FollowDialogComponent, FollowDialogResult> {
        if (!this.currentUser) {
            this.openLoginDialog();
        } else {
            return this.openFollowDialog();
        }
    }

    private updatePackageFollow(follow: Follow): void {
        this.userFollow = follow;
        this.isFollowing = follow != null;
    }

    private openFollowDialog(): MatDialogRef<FollowDialogComponent, FollowDialogResult> {
        return this.dialog.open(FollowDialogComponent, {
            width: "500px",
            data: {
                follow: this.userFollow,
                followIdentifier: this.buildFollowIdentifier()
            }
        });
    }

    private openLoginDialog(): void {
        this.router.navigate([], { queryParams: { following: true }, preserveFragment: true });
        this.dialog
            .open(LoginDialogComponent, {
                disableClose: true
            })
            .afterClosed()
            .subscribe(() => this.router.navigate([], { preserveFragment: true }));
    }
}
