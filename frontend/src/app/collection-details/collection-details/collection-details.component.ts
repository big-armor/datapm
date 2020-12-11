import { Component, OnDestroy, OnInit } from "@angular/core";
import { ActivatedRoute, ParamMap } from "@angular/router";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { PageState } from "src/app/models/page-state";
import { Collection, CollectionGQL } from "src/generated/graphql";
import { mockPackages } from "./mock-data";

@Component({
    selector: "app-collection-details",
    templateUrl: "./collection-details.component.html",
    styleUrls: ["./collection-details.component.scss"]
})
export class CollectionDetailsComponent implements OnInit, OnDestroy {
    public collectionSlug: string = "";
    public collection: Collection;
    public state: PageState = "INIT";
    private unsubscribe$: Subject<any> = new Subject();

    constructor(private route: ActivatedRoute, private collectionGQL: CollectionGQL) {
        this.route.paramMap.pipe(takeUntil(this.unsubscribe$)).subscribe((paramMap: ParamMap) => {
            this.collectionSlug = paramMap.get("collectionSlug") || "";
            this.getCollectionDetails();
        });
    }

    ngOnInit(): void {}

    ngOnDestroy() {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }

    private getCollectionDetails() {
        if (!this.collectionSlug) {
            return;
        }

        this.state = "LOADING";
        this.collectionGQL
            .fetch({
                identifier: {
                    collectionSlug: this.collectionSlug
                }
            })
            .subscribe(
                ({ data }) => {
                    this.collection = data.collection as Collection;
                    this.collection.packages = mockPackages as any; // To be removed later
                    this.state = "SUCCESS";
                },
                () => {
                    this.state = "ERROR";
                }
            );
    }
}
