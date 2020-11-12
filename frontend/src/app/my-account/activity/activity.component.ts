import { Component, OnInit } from "@angular/core";
import { MyCollectionsGQL } from "src/generated/graphql";

class MyCollections {
    allCollections: any;
}

@Component({
    selector: "me-activity",
    templateUrl: "./activity.component.html",
    styleUrls: ["./activity.component.scss"]
})
export class ActivityComponent implements OnInit {
    public collections: MyCollections[] = [];
    constructor(private myCollections: MyCollectionsGQL) {}

    ngOnInit(): void {
        this.loadMyCollections();
    }

    private loadMyCollections(): void {
        // Need to set a dynamic limit for future / pagination
        this.myCollections.fetch({ offSet: 0, limit: 5 }).subscribe((a) => {
            this.collections = a.data.myCollections.collections.map((p) => {
                return {
                    allCollections: p
                };
            });
        });
    }
}
