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
    public isFavorite = false;
    public packagesWithModifiedDate: PackageWithModifiedDate[] = [];

    constructor(private recentlyViewedPackagesQuery: MyRecentlyViewedPackagesGQL) {}

    public ngOnInit(): void {
        this.state = State.LOADING;
        this.loadLatestPackages();
    }

    public makeFavorite(): void {
        this.isFavorite = !this.isFavorite;
    }

    private loadLatestPackages(): void {
        this.recentlyViewedPackagesQuery.fetch({ offset: 0, limit: 25 }).subscribe(
            (response) => {
                if (response.errors) {
                    this.state = State.ERROR;
                    return;
                }

                const dateNow = new Date();
                this.packagesWithModifiedDate = response.data.myRecentlyViewedPackages.logs.map((l) => {
                    const changeDates = this.getLastChangedDates(l.targetPackage);
                    return {
                        package: l.targetPackage,
                        lastActivityLabel: this.getUpdatedDateLabel(
                            new Date(changeDates.createdAt),
                            new Date(changeDates.updatedAt),
                            dateNow
                        )
                    };
                });
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
}
