import { Component, Input, OnInit } from "@angular/core";
import { MatDialog, MatDialogRef } from "@angular/material/dialog";
import { ConfirmationDialogService } from "src/app/services/dialog/confirmation-dialog.service";
import {
    FollowDialogComponent,
    FollowDialogData,
    FollowDialogResult
} from "src/app/shared/dialogs/follow-dialog/follow-dialog.component";
import {
    DeleteFollowGQL,
    Follow,
    FollowIdentifierInput,
    FollowType,
    MyFollowsGQL,
    NotificationFrequency,
    SaveFollowGQL
} from "src/generated/graphql";
import { FollowStats } from "../user-following.component";

@Component({
    selector: "app-user-type-following",
    templateUrl: "./user-type-following.component.html"
})
export class UserTypeFollowingComponent implements OnInit {
    public readonly NotificationFrequency = NotificationFrequency;
    public readonly NOTIFICATION_FREQUENCIES: NotificationFrequency[] = Object.values(NotificationFrequency);

    public readonly COLUMNS = ["name", "frequency", "action"];

    @Input()
    public itemsName: string;

    @Input()
    public type: FollowType;

    @Input()
    public stats: FollowStats;

    public follows: Follow[] = [];
    public hasMore: boolean = false;
    public loading: boolean = false;

    private offset: number = 0;

    constructor(private dialog: MatDialog, private myFollowsGQL: MyFollowsGQL, private saveFollowGQL: SaveFollowGQL) {}

    public ngOnInit(): void {
        this.loadFollows();
    }

    public getFollowEntityName(follow: Follow): string {
        switch (this.type) {
            case FollowType.CATALOG:
                return follow.catalog.displayName;
            case FollowType.COLLECTION:
                return follow.collection.name;
            case FollowType.PACKAGE:
                return follow.package?.displayName;
            case FollowType.PACKAGE_ISSUE:
                return follow.packageIssue.subject;
            case FollowType.USER:
                const user = follow.user;
                return user.firstName ? user.firstName + " " + user.lastName : user.username;
            default:
                return null;
        }
    }

    public getFollowEntityLink(follow: Follow): string {
        let prefix = "/";
        switch (this.type) {
            case FollowType.CATALOG:
                return prefix + follow.catalog.identifier.catalogSlug;
            case FollowType.COLLECTION:
                return prefix + "collection/" + follow.collection.identifier.collectionSlug;
            case FollowType.PACKAGE:
                return prefix + follow.package.identifier.catalogSlug + "/" + follow.package.identifier.packageSlug;
            case FollowType.PACKAGE_ISSUE:
                const issue = follow.packageIssue;
                return (
                    prefix +
                    issue.packageIdentifier.catalogSlug +
                    "/" +
                    issue.packageIdentifier.packageSlug +
                    "/issues/" +
                    issue.issueNumber
                );
            case FollowType.USER:
                return prefix + follow.user.username;
            default:
                return null;
        }
    }

    public updateFollow(follow: Follow): void {
        const identifier = this.getFollowIdentifier(follow);
        this.saveFollowGQL
            .mutate({
                follow: {
                    ...identifier,
                    notificationFrequency: follow.notificationFrequency
                }
            })
            .subscribe();
    }

    public openFollowModal(follow): void {
        this.dialog
            .open(FollowDialogComponent, {
                width: "500px",
                data: {
                    follow,
                    followIdentifier: this.getFollowIdentifier(follow)
                } as FollowDialogData
            })
            .afterClosed()
            .subscribe((result) => {
                this.offset = 0;
                const limit = this.follows?.length || 10;
                this.follows = [];
                this.loadFollows();
            });
    }

    public loadFollows(limit: number = 10): void {
        this.loading = true;
        this.myFollowsGQL
            .fetch({
                type: this.type,
                limit: limit,
                offset: this.offset
            })
            .subscribe((response) => {
                this.loading = false;
                if (!response.data) {
                    return;
                }

                const responseData = response.data.myFollows;
                const follows = responseData.follows;
                this.offset += follows.length;
                this.follows = [...this.follows, ...follows];
                this.hasMore = responseData.hasMore;
                this.updateStats();
            });
    }

    private reloadFollows(): void {
        this.offset = 0;
        this.follows = [];
        this.loadFollows();
    }

    private getFollowIdentifier(follow: Follow): FollowIdentifierInput {
        switch (this.type) {
            case FollowType.CATALOG:
                return {
                    catalog: {
                        catalogSlug: follow.catalog.identifier.catalogSlug
                    }
                };
            case FollowType.COLLECTION:
                return {
                    collection: {
                        collectionSlug: follow.collection.identifier.collectionSlug
                    }
                };
            case FollowType.PACKAGE:
                return {
                    package: {
                        catalogSlug: follow.package.identifier.catalogSlug,
                        packageSlug: follow.package.identifier.packageSlug
                    }
                };
            case FollowType.PACKAGE_ISSUE:
                return {
                    packageIssue: {
                        packageIdentifier: {
                            catalogSlug: follow.packageIssue.packageIdentifier.catalogSlug,
                            packageSlug: follow.packageIssue.packageIdentifier.packageSlug
                        },
                        issueNumber: follow.packageIssue.issueNumber
                    }
                };
            case FollowType.USER:
                return {
                    user: {
                        username: follow.user.username
                    }
                };
            default:
                return null;
        }
    }

    private updateStats(): void {
        switch (this.type) {
            case FollowType.CATALOG:
                this.stats.catalogFollowsCount = this.follows.length;
                break;
            case FollowType.COLLECTION:
                this.stats.collectionFollowsCount = this.follows.length;
                break;
            case FollowType.PACKAGE:
                this.stats.packageFollowsCount = this.follows.length;
                break;
            case FollowType.PACKAGE_ISSUE:
                this.stats.packageIssueFollowsCount = this.follows.length;
                break;
            case FollowType.USER:
                this.stats.userFollowsCount = this.follows.length;
                break;
        }
    }
}
