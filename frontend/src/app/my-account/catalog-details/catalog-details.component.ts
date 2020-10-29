import { Component, OnInit } from "@angular/core";
import { GetCatalogGQL, GetCatalogQuery } from "src/generated/graphql";
import { ActivatedRoute, Router } from "@angular/router";

@Component({
    selector: "me-catalog-details",
    templateUrl: "./catalog-details.component.html",
    styleUrls: ["./catalog-details.component.scss"]
})
export class CatalogDetailsComponent implements OnInit {
    getCatalogQuery: GetCatalogQuery;
    urlParams: any;

    constructor(private getCatalogGQL: GetCatalogGQL, private route: ActivatedRoute, private router: Router) {}

    ngOnInit(): void {
        this.route.paramMap.subscribe((params) => {
            console.log(params);
            this.urlParams = params;
            console.log(this.getCatalogGQL);
            this.getCatalogGQL
                .watch({ identifier: { catalogSlug: this.urlParams.params.catalogSlug } })
                .valueChanges.subscribe(({ data }) => {
                    this.getCatalogQuery = data;
                });
        });
    }
}
