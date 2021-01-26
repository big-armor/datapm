import { Component, OnInit } from "@angular/core";
import { GetLatestPackagesGQL, Package } from "src/generated/graphql";
import { LimitAndOffset } from "src/app/shared/package-and-collection/limit-and-offset";

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
    public readonly LIMIT_PER_LOAD = 1;

    public State = State;
    public state = State.LOADING;
    public packages: Package[] = [];

    public hasMorePackages = false;

    constructor(private latestPackages: GetLatestPackagesGQL) {}

    public ngOnInit(): void {
        this.state = State.LOADING;
        this.loadPackages({ limit: this.LIMIT_PER_LOAD, offset: 0 });
    }

    public loadPackages(limitAndOffset: LimitAndOffset): void {
        this.latestPackages.fetch(limitAndOffset).subscribe(
            (response) => {
                if (response.errors) {
                    this.state = State.ERROR;
                    return;
                }

                this.packages = this.packages.concat(response.data.latestPackages.packages as Package[]);
                this.hasMorePackages = response.data.latestPackages.hasMore;
                this.state = State.LOADED;
            },
            (error) => {
                this.state = State.ERROR;
            }
        );
    }
}
