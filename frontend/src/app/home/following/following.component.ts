import { Component, OnInit } from "@angular/core";
import { TimeAgoPipe } from "src/app/shared/pipes/time-ago.pipe";
import { ActivityLog, MyFollowingActivityGQL, User } from "src/generated/graphql";

interface LogWithListingMetadata extends ActivityLog {
    authorFullName: string;
    timeAgoLabel: string;
}

@Component({
    selector: "following",
    templateUrl: "./following.component.html",
    styleUrls: ["./following.component.scss"]
})
export class FollowingComponent implements OnInit {
    private readonly MAX_ACTIVITIES_LOADED_PER_PAGE = 10;

    public logs: LogWithListingMetadata[] = [];
    public hasMore: boolean;

    private offset: number = 0;

    constructor(private myFollowingActivityGQL: MyFollowingActivityGQL, private timeAgoPipe: TimeAgoPipe) {}

    public ngOnInit(): void {
        this.loadMoreLogs();
    }

    private loadMoreLogs(): void {
        this.myFollowingActivityGQL
            .fetch({
                offset: this.offset,
                limit: this.MAX_ACTIVITIES_LOADED_PER_PAGE
            })
            .subscribe((result) => {
                const returnedData = result.data.myFollowingActivity;
                this.addLogs(returnedData.logs as ActivityLog[]);
                this.hasMore = returnedData.hasMore;
                this.offset = this.logs.length;
            });
    }

    private addLogs(logs: ActivityLog[]): void {
        const logsWithMetadata = logs.map((log) => this.mapLogToLogWithMetadata(log));
        this.logs.push(...logsWithMetadata);
    }

    private mapLogToLogWithMetadata(log: ActivityLog): LogWithListingMetadata {
        const logWithMetadata = Object.assign(log, {}) as LogWithListingMetadata;
        logWithMetadata.authorFullName = this.getUserName(log.user);
        logWithMetadata.timeAgoLabel = this.timeAgoPipe.transform(log.createdAt);
        return logWithMetadata;
    }

    private getUserName(user: User): string {
        if (!user) {
            return null;
        }

        if (user.firstName && user.lastName) {
            return user.firstName + " " + user.lastName;
        }

        return user.username;
    }
}
