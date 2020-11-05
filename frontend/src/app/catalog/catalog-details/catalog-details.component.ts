import { Component, OnInit } from "@angular/core";
import { GetCatalogGQL, GetCatalogQuery } from "src/generated/graphql";
import { ActivatedRoute } from "@angular/router";

@Component({
    selector: "app-catalog-details",
    templateUrl: "./catalog-details.component.html",
    styleUrls: ["./catalog-details.component.scss"]
})
export class CatalogDetailsComponent implements OnInit {
    getCatalogQuery: GetCatalogQuery;

    constructor(private getCatalogGQL: GetCatalogGQL, private route: ActivatedRoute) {}

    ngOnInit(): void {
        const catalogSlug = this.route.snapshot.paramMap.get("catalogSlug");
        this.getCatalogGQL.fetch({ identifier: { catalogSlug } }).subscribe(({ data }) => {
            this.getCatalogQuery = data;
        });
    }
}
