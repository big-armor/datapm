import { Component, OnInit } from "@angular/core";
import { MyCollectionsGQL } from "src/generated/graphql";
import { Subject } from "rxjs";
import { take, takeUntil } from "rxjs/operators";

class DackageWithModifiedDate {
    package: any;
}

@Component({
    selector: "me-activity",
    templateUrl: "./activity.component.html",
    styleUrls: ["./activity.component.scss"]
})
export class ActivityComponent implements OnInit {
    // collectionState = State.INIT;
    // private subscription = new Subject();
    public colls: DackageWithModifiedDate[] = [];
    constructor(private myCollections: MyCollectionsGQL) {}

    ngOnInit(): void {
        this.loadLatestCollections();
    }

    private loadLatestCollections(): void {
        this.myCollections.fetch({ offSet: 0, limit: 5 }).subscribe((a) => {
            const dateNow = new Date();
            this.colls = a.data.myCollections.collections.map((p) => {
                // const changeDates = this.getLastChangedDates(p);
                console.log("P: ", p);
                return {
                    package: p
                };
            });
        });
    }

    // loadMyCollections() {
    //     this.myCollections
    //         .fetch({
    //             limit: 10,
    //             offSet: 0
    //         })
    //         .pipe(takeUntil(this.subscription))
    //         .subscribe((response) => {
    //             if (response.data?.myCollections.collections.length <= 0) {
    //                 this.collectionState = State.ERROR;
    //                 return;
    //             }
    //             this.coll.push(response.data.myCollections.collections);
    //             this.coll.map((p) => {
    //                 return {
    //                     collections: p
    //                 };
    //             });
    //         });
    // }
}
