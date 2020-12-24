import { Component, Input, OnInit } from "@angular/core";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { MyPackagesGQL, Package, UserPackagesGQL } from "src/generated/graphql";

enum State {
    INIT,
    LOADING,
    SUCCESS,
    ERROR
}
@Component({
    selector: "app-user-packages",
    templateUrl: "./user-packages.component.html",
    styleUrls: ["./user-packages.component.scss"]
})
export class UserPackagesComponent implements OnInit {
    @Input() username: string;
    @Input() isCurrentUser: boolean;

    State = State;
    state = State.INIT;
    public packages: Package[];
    private subscription = new Subject();

    constructor(private userPackages: UserPackagesGQL) {}

    ngOnInit(): void {
        this.refreshPackages();
    }

    refreshPackages() {
        this.state = State.LOADING;
        this.userPackages
            .fetch({ username: this.username, offSet: 0, limit: 1000 })
            .pipe(takeUntil(this.subscription))
            .subscribe((response) => {
                if (response.errors?.length > 0) {
                    this.state = State.ERROR;
                    return;
                }
                this.packages = response.data.userPackages.packages as Package[];
                this.state = State.SUCCESS;
            });
    }
}
