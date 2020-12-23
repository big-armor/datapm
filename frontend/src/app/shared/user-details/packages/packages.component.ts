import { Component, OnInit } from "@angular/core";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { MyPackagesGQL, Package } from "src/generated/graphql";

enum State {
    INIT,
    LOADING,
    SUCCESS,
    ERROR
}
@Component({
    selector: "me-packages",
    templateUrl: "./packages.component.html",
    styleUrls: ["./packages.component.scss"]
})
export class PackagesComponent implements OnInit {
    State = State;
    state = State.INIT;
    public myPackages: Package[];
    private subscription = new Subject();
    constructor(private myPackagesGQL: MyPackagesGQL) {}

    ngOnInit(): void {
        this.refreshPackages();
    }

    refreshPackages() {
        this.state = State.LOADING;
        this.myPackagesGQL
            .fetch({ offset: 0, limit: 1000 })
            .pipe(takeUntil(this.subscription))
            .subscribe((response) => {
                if (response.errors?.length > 0) {
                    this.state = State.ERROR;
                    return;
                }
                this.myPackages = response.data.myPackages.packages as Package[];
                this.state = State.SUCCESS;
            });
    }
}
