import { Component, OnInit } from "@angular/core";
import { GetLatestPackagesGQL } from "src/generated/graphql";
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
    selector: "latest",
    templateUrl: "./latest.component.html",
    styleUrls: ["./latest.component.scss"]
})
export class LatestComponent implements OnInit {
    State = State;
    state = State.LOADING;
    public isFavorite = false;
    public packagesWithModifiedDate: PackageWithModifiedDate[] = [];

    constructor(private latestPackages: GetLatestPackagesGQL) {}

    public ngOnInit(): void {
        this.state = State.LOADING;
        this.loadLatestPackages();
    }

    public makeFavorite(): void {
        this.isFavorite = !this.isFavorite;
    }

    private loadLatestPackages(): void {
        this.latestPackages.fetch({ offset: 0, limit: 5 }).subscribe(
            (response) => {
                if (response.errors) {
                    this.state = State.ERROR;
                    return;
                }

                const dateNow = new Date();
                this.packagesWithModifiedDate = response.data.latestPackages.packages.map((p) => {
                    const changeDates = this.getLastChangedDates(p);
                    return {
                        package: p,
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
