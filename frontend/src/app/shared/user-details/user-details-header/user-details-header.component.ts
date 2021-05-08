import { Component, Input, OnChanges, SimpleChanges } from "@angular/core";
import { MatDialog, MatDialogRef } from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { AuthenticationService } from "src/app/services/authentication.service";
import { Follow, FollowIdentifierInput, GetFollowGQL, User } from "src/generated/graphql";
import { FollowDialogComponent, FollowDialogResult } from "../../dialogs/follow-dialog/follow-dialog.component";

@Component({
    selector: "app-user-details-header",
    templateUrl: "./user-details-header.component.html",
    styleUrls: ["./user-details-header.component.scss"]
})
export class UserDetailsHeaderComponent implements OnChanges {
    @Input()
    public user: User;
    public currentUser: User;

    private subscription: Subscription;

    public userFollow: Follow;
    public isFollowing: boolean;

    constructor(
        public dialog: MatDialog,
        private authService: AuthenticationService,
        private getFollowGQL: GetFollowGQL
    ) {
        this.subscription = this.authService.currentUser.subscribe((user: User) => {
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
        return this.user && this.currentUser?.username === this.user.username;
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

    private buildFollowIdentifier(): FollowIdentifierInput {
        return {
            user: {
                username: this.user.username
            }
        };
    }

    private openFollowModal(): MatDialogRef<FollowDialogComponent, FollowDialogResult> {
        return this.dialog.open(FollowDialogComponent, {
            width: "500px",
            data: {
                follow: this.userFollow,
                followIdentifier: this.buildFollowIdentifier()
            }
        });
    }

    private updatePackageFollow(follow: Follow): void {
        this.userFollow = follow;
        this.isFollowing = follow != null;
    }
}
