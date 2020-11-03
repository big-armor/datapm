import { Component, OnInit } from "@angular/core";
import { Catalog, MyCatalogsGQL } from "src/generated/graphql";
import { Subject } from "rxjs";
import { take, takeUntil } from "rxjs/operators";

enum State {
    INIT,
    LOADING,
    ERROR,
    SUCCESS,
    ERROR_NOT_UNIQUE,
    ERROR_NO_LABEL
}
@Component({
    selector: "me-catalogs",
    templateUrl: "./catalogs.component.html",
    styleUrls: ["./catalogs.component.scss"]
})
export class CatalogsComponent implements OnInit {
    catalogState = State.INIT;
    public myCatalogs: Catalog[];
    private subscription = new Subject();

    constructor(private myCatalogsGQL: MyCatalogsGQL) {}

    ngOnInit(): void {
        this.refreshCatalogs();
    }

    refreshCatalogs() {
        this.myCatalogsGQL
            .fetch()
            .pipe(takeUntil(this.subscription))
            .subscribe((response) => {
                if (response.errors?.length > 0) {
                    this.catalogState = State.ERROR;
                    return;
                }
                this.myCatalogs = response.data.myCatalogs;
                this.catalogState = State.SUCCESS;
            });
    }
}
