import { Component, Input, OnChanges, SimpleChanges } from "@angular/core";
import { MatDialog, MatDialogRef } from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { AuthenticationService } from "src/app/services/authentication.service";
import {
    DeleteFollowGQL,
    Follow,
    GetFollowGQL,
    NotificationFrequency,
    SaveFollowGQL,
    User
} from "src/generated/graphql";
import { FollowDialogComponent } from "../../dialogs/follow-dialog/follow-dialog.component";

@Component({
    selector: "app-user-details-header",
    templateUrl: "./user-details-header.component.html",
    styleUrls: ["./user-details-header.component.scss"]
})
export class UserDetailsHeaderComponent implements OnChanges {
    @Input() user: User;
    private currentUser: User;
    private subscription: Subscription;

    public userFollow: Follow;
    public isFollowing: boolean;

    constructor(
        public dialog: MatDialog,
        private authService: AuthenticationService,
        private getFollowGQL: GetFollowGQL,
        private saveFollowGQL: SaveFollowGQL,
        private deleteFollowGQL: DeleteFollowGQL
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
                } else if (result.notificationFrequency === NotificationFrequency.NEVER) {
                    this.deleteFollow();
                    return;
                }

                this.saveFollowGQL
                    .mutate({
                        follow: {
                            user: {
                                username: this.user.username
                            },
                            notificationFrequency: result.notificationFrequency
                        }
                    })
                    .subscribe(() => this.updatePackageFollow(result));
            });
    }

    private deleteFollow(): void {
        this.deleteFollowGQL
            .mutate({
                follow: {
                    user: {
                        username: this.user.username
                    }
                }
            })
            .subscribe(() => this.updatePackageFollow(null));
    }

    private getFollow(): void {
        this.getFollowGQL
            .fetch({
                follow: {
                    user: {
                        username: this.user.username
                    }
                }
            })
            .subscribe((response) => this.updatePackageFollow(response.data?.getFollow));
    }

    private openFollowModal(): MatDialogRef<FollowDialogComponent, Follow> {
        return this.dialog.open(FollowDialogComponent, {
            width: "500px",
            data: this.userFollow
        });
    }

    private updatePackageFollow(follow: Follow): void {
        this.userFollow = follow;
        if (!follow) {
            this.isFollowing = false;
        } else {
            this.isFollowing = follow.notificationFrequency !== NotificationFrequency.NEVER;
        }
    }
}
