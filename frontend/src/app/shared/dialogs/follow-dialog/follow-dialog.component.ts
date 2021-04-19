import { Component, Inject } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import {
    DeleteFollowGQL,
    Follow,
    FollowIdentifierInput,
    NotificationFrequency,
    SaveFollowGQL
} from "src/generated/graphql";

export interface FollowDialogData {
    follow: Follow;
    followIdentifier: FollowIdentifierInput;
}

export interface FollowDialogResult {
    follow: Follow;
    type: FollowDialogResultType;
}

export enum FollowDialogResultType {
    FOLLOW_DELETED,
    FOLLOW_UPDATED
}

@Component({
    selector: "app-follow-dialog",
    templateUrl: "./follow-dialog.component.html",
    styleUrls: ["./follow-dialog.component.scss"]
})
export class FollowDialogComponent {
    public readonly frequencies: NotificationFrequency[] = Object.values(NotificationFrequency);

    public follow: Follow;
    public isFollowing = false;
    public selectedFrequency: NotificationFrequency = NotificationFrequency.DAILY;

    private followIdentifier: FollowIdentifierInput;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: FollowDialogData,
        private dialogRef: MatDialogRef<FollowDialogComponent>,
        private saveFollowGQL: SaveFollowGQL,
        private deleteFollowGQL: DeleteFollowGQL
    ) {
        if (data) {
            this.follow = Object.assign({}, data.follow);
            if (data.follow) {
                this.isFollowing = true;
                this.selectedFrequency = data.follow.notificationFrequency;
            }
            this.followIdentifier = data.followIdentifier;
        }
    }

    public save(): void {
        if (!this.follow) {
            this.follow = {} as Follow;
        }

        this.follow.notificationFrequency = this.selectedFrequency;
        this.saveFollow();
    }

    public cancel(): void {
        this.close();
    }

    public deleteFollow(): void {
        this.deleteFollowGQL
            .mutate({
                follow: this.followIdentifier
            })
            .subscribe(() => this.closeWithValues(null, FollowDialogResultType.FOLLOW_DELETED));
    }

    private saveFollow(): void {
        this.saveFollowGQL
            .mutate({
                follow: {
                    ...this.followIdentifier,
                    notificationFrequency: this.selectedFrequency
                }
            })
            .subscribe(() => this.closeWithValues(this.follow, FollowDialogResultType.FOLLOW_UPDATED));
    }

    private closeWithValues(follow: Follow, type: FollowDialogResultType): void {
        const result = this.buildResult(follow, type);
        this.close(result);
    }

    private buildResult(follow: Follow, type: FollowDialogResultType): FollowDialogResult {
        return { follow, type };
    }

    private close(result?: FollowDialogResult): void {
        this.dialogRef.close(result);
    }
}
