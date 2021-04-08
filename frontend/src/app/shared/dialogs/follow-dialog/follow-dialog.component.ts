import { Component, Inject } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { Follow, NotificationFrequency } from "src/generated/graphql";

@Component({
    selector: "app-follow-dialog",
    templateUrl: "./follow-dialog.component.html",
    styleUrls: ["./follow-dialog.component.scss"]
})
export class FollowDialogComponent {
    public readonly frequencies: NotificationFrequency[] = Object.values(NotificationFrequency);

    public selectedFrequency: NotificationFrequency = NotificationFrequency.DAILY;
    public isFollowing = false;

    public follow: Follow;

    constructor(@Inject(MAT_DIALOG_DATA) public data: Follow, private dialogRef: MatDialogRef<FollowDialogComponent>) {
        if (data) {
            this.isFollowing = true;
            this.follow = Object.assign({}, data);
            this.selectedFrequency = this.follow.notificationFrequency;
        }
    }

    public save(): void {
        if (!this.follow) {
            this.follow = {} as Follow;
        }

        this.follow.notificationFrequency = this.selectedFrequency;
        this.dialogRef.close(this.follow);
    }

    public cancel(): void {
        this.dialogRef.close();
    }
}
