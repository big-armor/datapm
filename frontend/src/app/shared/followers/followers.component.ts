import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { User } from "src/generated/graphql";

export interface FollowersRequest {
    offset: number;
    limit: number;
}

@Component({
    selector: "app-followers",
    templateUrl: "./followers.component.html",
    styleUrls: ["./followers.component.scss"]
})
export class FollowersComponent implements OnInit {
    private readonly FOLLOWERS_PER_PAGE = 1;

    @Input()
    public hasLoadingErrors: boolean;

    @Input()
    public followers: User[] = [];

    @Input()
    public hasMoreFollowers: boolean;

    @Input()
    public loadingFollowers: boolean;

    @Input()
    public objectType: string;

    @Output()
    public onMoreFollowersRequested = new EventEmitter<FollowersRequest>();

    public ngOnInit(): void {
        this.requestMoreFollowers();
    }

    public requestMoreFollowers(): void {
        if (this.loadingFollowers) {
            return;
        }

        this.onMoreFollowersRequested.emit({
            offset: this.followers.length,
            limit: this.FOLLOWERS_PER_PAGE
        });
    }
}
