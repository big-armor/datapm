import { Component } from "@angular/core";
import { ConfirmationDialogService } from "src/app/services/dialog/confirmation-dialog.service";
import { FollowType } from "src/generated/graphql";

@Component({
    selector: "app-user-following",
    templateUrl: "./user-following.component.html",
    styleUrls: ["./user-following.component.scss"]
})
export class UserFollowingComponent {
    public FollowType = FollowType;

    public isFollowing: boolean = false;

    public setFollowing(): void {
        this.isFollowing = true;
    }
}
