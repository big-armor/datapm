import { Component, OnInit } from "@angular/core";
import { GetLatestPackagesGQL, MyRecentlyViewedPackagesGQL } from "src/generated/graphql";
import { getTimeDifferenceLabel } from "src/app/helpers/TimeUtil";

class PackageWithModifiedDate {
    package: any;
    lastActivityLabel: string;
}

enum State {
    LOADED,
    LOADING,
    ERROR
}
@Component({
    selector: "recently-viewed",
    templateUrl: "./recently-viewed.component.html",
    styleUrls: ["./recently-viewed.component.scss"]
})
export class RecentlyViewedComponent implements OnInit {
    State = State;
    state = State.LOADING;
    public offSet = 0;
    public hasMore = false;
    public packages: PackageWithModifiedDate[] = [];

    constructor(private recentlyViewedPackagesQuery: MyRecentlyViewedPackagesGQL) {}

    public ngOnInit(): void {
        this.state = State.LOADING;
        this.packages = [];
        this.loadPackages();
    }

    private loadPackages(): void {
        this.recentlyViewedPackagesQuery.fetch({ offset: this.offSet, limit: 25 }).subscribe(
            (response) => {
                if (response.errors) {
                    this.state = State.ERROR;
                    return;
                }

                this.hasMore = response.data.myRecentlyViewedPackages.hasMore;
                const dateNow = new Date();
                const receivedPackages: PackageWithModifiedDate[] = response.data.myRecentlyViewedPackages.logs.map(
                    (l) => {
                        const changeDates = this.getLastChangedDates(l.targetPackage);
                        return {
                            package: l.targetPackage,
                            lastActivityLabel: this.getUpdatedDateLabel(
                                new Date(changeDates.createdAt),
                                new Date(changeDates.updatedAt),
                                dateNow
                            )
                        };
                    }
                );
                this.packages = this.packages.concat(receivedPackages);

                this.state = State.LOADED;
            },
            (error) => {
                this.state = State.ERROR;
            }
        );
    }

    private getLastChangedDates(pkg: any): { createdAt: Date; updatedAt: Date } {
        if (pkg.latestVersion != null) {
            return {
                createdAt: pkg.latestVersion.createdAt,
                updatedAt: pkg.latestVersion.updatedAt
            };
        } else {
            return {
                createdAt: pkg.createdAt,
                updatedAt: pkg.updatedAt
            };
        }
    }

    private getUpdatedDateLabel(createdAtDate: Date, updatedAtDate: Date, dateNow: Date): string {
        let actionLabel;
        if (createdAtDate.getTime() == updatedAtDate.getTime()) {
            actionLabel = "Created ";
        } else {
            actionLabel = "Updated ";
        }

        const differenceLabel = getTimeDifferenceLabel(updatedAtDate, dateNow);
        return actionLabel + differenceLabel;
    }

    public loadMore() {
        this.offSet += 25;
        this.loadPackages();
    }
}
