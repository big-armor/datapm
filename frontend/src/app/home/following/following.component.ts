import { Component, OnInit } from "@angular/core";
import { TimeAgoPipe } from "src/app/shared/pipes/time-ago.pipe";
import {
    ActivityLog,
    ActivityLogEventType,
    MyFollowingActivityGQL,
    PackageIdentifier,
    User
} from "src/generated/graphql";

class LogWithListingMetadata {
    author: User;
    authorFullName: string;
    changeTypeLabel: string;
    entitiesBinderLabel: string;
    timeAgoLabel: string;
    changedEntityInformation: EntityInformation;
}

class EntityInformation {
    type: string;
    name: string;
    url: string;
    affectedEntityInformation?: EntityInformation;
}

@Component({
    selector: "following",
    templateUrl: "./following.component.html",
    styleUrls: ["./following.component.scss"]
})
export class FollowingComponent implements OnInit {
    private readonly MAX_ACTIVITIES_LOADED_PER_PAGE = 10;
    private readonly PACKAGE = "package";
    private readonly PACKAGE_ISSUE = "package issue";
    private readonly CATALOG = "catalog";
    private readonly COLLECTION = "collection";

    public logs: LogWithListingMetadata[] = [];
    public hasMore: boolean;
    public loadingLogs: boolean;
    public errorLoadingLogs: boolean;

    private offset: number = 0;

    constructor(private myFollowingActivityGQL: MyFollowingActivityGQL, private timeAgoPipe: TimeAgoPipe) {}

    public ngOnInit(): void {
        this.loadLogs();
    }

    public loadMoreLogs(): void {
        if (!this.hasMore) {
            return;
        }

        this.loadLogs();
    }

    private loadLogs(): void {
        this.loadingLogs = true;
        this.myFollowingActivityGQL
            .fetch({
                offset: this.offset,
                limit: this.MAX_ACTIVITIES_LOADED_PER_PAGE
            })
            .subscribe(
                ({ data, errors }) => {
                    if (errors) {
                        this.loadingLogs = false;
                        this.errorLoadingLogs = true;
                        return;
                    }
                    const returnedData = data.myFollowingActivity;
                    this.addLogs(returnedData.logs as ActivityLog[]);
                    this.hasMore = returnedData.hasMore;
                    this.offset = this.logs.length;
                    this.loadingLogs = false;
                },
                (error) => {
                    this.loadingLogs = false;
                    this.errorLoadingLogs = true;
                }
            );
    }

    private addLogs(logs: ActivityLog[]): void {
        const logsWithMetadata = logs
            .map((log) => this.mapLogToLogWithMetadata(log))
            .filter((log) => !!log.changedEntityInformation);
        this.logs.push(...logsWithMetadata);
    }

    private mapLogToLogWithMetadata(log: ActivityLog): LogWithListingMetadata {
        const logWithMetadata = new LogWithListingMetadata();
        logWithMetadata.authorFullName = this.getUserName(log.user);
        logWithMetadata.author = log.user;

        const labels = this.buildChangeTypeLabel(log);
        logWithMetadata.changeTypeLabel = labels.changeTypeLabel;
        logWithMetadata.entitiesBinderLabel = labels.entitiesBinderLabel;

        logWithMetadata.changedEntityInformation = this.buildChangedObjectInformation(log);
        logWithMetadata.timeAgoLabel = this.timeAgoPipe.transform(log.createdAt);
        return logWithMetadata;
    }

    private buildChangeTypeLabel(log: ActivityLog): { changeTypeLabel: string; entitiesBinderLabel?: string } {
        switch (log.eventType) {
            case ActivityLogEventType.PACKAGE_CREATED:
            case ActivityLogEventType.PACKAGE_ISSUE_CREATED:
            case ActivityLogEventType.CATALOG_CREATED:
            case ActivityLogEventType.COLLECTION_CREATED:
                return { changeTypeLabel: "created" };
            case ActivityLogEventType.PACKAGE_DELETED:
            case ActivityLogEventType.PACKAGE_ISSUE_DELETED:
            case ActivityLogEventType.CATALOG_DELETED:
            case ActivityLogEventType.COLLECTION_DELETED:
                return { changeTypeLabel: "deleted" };
            case ActivityLogEventType.PACKAGE_ISSUE_COMMENT_CREATED:
                return { changeTypeLabel: "commented on" };
            case ActivityLogEventType.PACKAGE_ISSUE_CLOSED:
                return { changeTypeLabel: "closed" };
            case ActivityLogEventType.COLLECTION_PACKAGE_ADDED:
                return { changeTypeLabel: "added", entitiesBinderLabel: "to" };
            case ActivityLogEventType.COLLECTION_PACKAGE_REMOVED:
                return { changeTypeLabel: "removed", entitiesBinderLabel: "from" };
            default:
                return { changeTypeLabel: "updated" };
        }
    }

    private buildChangedObjectInformation(log: ActivityLog): EntityInformation {
        // TODO: Ermal - Discuss how to show the names of catalogs
        if (log.targetPackageIssue) {
            return this.buildPackageIssueEntityInformation(log);
        } else if (log.targetCatalog) {
            return this.buildCatalogEntityInformation(log);
        } else if (log.targetCollection) {
            return this.buildCollectionEntityInformation(log);
        } else if (log.targetPackage) {
            return this.buildPackageEntityInformation(log.targetPackage.identifier);
        }
    }

    private buildPackageEntityInformation(identifier: PackageIdentifier): EntityInformation {
        const name = identifier.catalogSlug + "/" + identifier.packageSlug;
        return {
            type: this.PACKAGE,
            name: name,
            url: "/" + name
        };
    }

    private buildPackageIssueEntityInformation(log: ActivityLog): EntityInformation {
        const packageIdentifier = log.targetPackageIssue.packageIdentifier;
        const base = packageIdentifier.catalogSlug + "/" + packageIdentifier.packageSlug;
        return {
            type: this.PACKAGE_ISSUE,
            name: base + "#" + log.targetPackageIssue.issueNumber,
            url: "/" + base + "/issues/" + log.targetPackageIssue.issueNumber
        };
    }

    private buildCatalogEntityInformation(log: ActivityLog): EntityInformation {
        const name = log.targetCatalog.identifier.catalogSlug;
        const information = this.buildEntityInformation(name, this.CATALOG);

        if (log.targetPackage) {
            information.affectedEntityInformation = this.buildPackageEntityInformation(log.targetPackage.identifier);
        }
        return information;
    }

    private buildCollectionEntityInformation(log: ActivityLog): EntityInformation {
        const name = log.targetCollection.identifier.collectionSlug;
        const information = this.buildEntityInformation(name, this.COLLECTION, "collection/");
        if (log.targetPackage) {
            information.affectedEntityInformation = this.buildPackageEntityInformation(log.targetPackage.identifier);
        }
        return information;
    }

    private buildEntityInformation(name: string, type: string, urlPrefix: string = ""): EntityInformation {
        const information = new EntityInformation();
        information.type = type;
        information.name = name;
        information.url = "/" + urlPrefix + name;
        return information;
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
