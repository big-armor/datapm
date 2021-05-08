import { Component } from "@angular/core";
import { FollowType } from "src/generated/graphql";

export class FollowStats {
    public catalogFollowsCount: number = 0;
    public collectionFollowsCount: number = 0;
    public packageFollowsCount: number = 0;
    public packageIssueFollowsCount: number = 0;
    public userFollowsCount: number = 0;
}

@Component({
    selector: "app-user-following",
    templateUrl: "./user-following.component.html",
    styleUrls: ["./user-following.component.scss"]
})
export class UserFollowingComponent {
    public readonly FollowType = FollowType;
    public readonly stats = new FollowStats();

    public isFollowing: boolean = false;

    public setFollowing(): void {
        this.isFollowing = true;
    }

    public get hasFollows(): boolean {
        return (
            this.stats.catalogFollowsCount > 0 ||
            this.stats.collectionFollowsCount > 0 ||
            this.stats.packageFollowsCount > 0 ||
            this.stats.packageIssueFollowsCount > 0 ||
            this.stats.userFollowsCount > 0
        );
    }
}
