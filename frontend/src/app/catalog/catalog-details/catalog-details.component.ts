import { Component, OnInit } from "@angular/core";
import { Catalog, GetCatalogGQL } from "src/generated/graphql";
import { ActivatedRoute } from "@angular/router";
import { MatDialog } from "@angular/material/dialog";
import { EditCatalogComponent } from "src/app/shared/edit-catalog/edit-catalog.component";
import { PageState } from "src/app/models/page-state";

@Component({
    selector: "app-catalog-details",
    templateUrl: "./catalog-details.component.html",
    styleUrls: ["./catalog-details.component.scss"]
})
export class CatalogDetailsComponent implements OnInit {
    public catalogSlug = "";
    public catalog: Catalog;
    public state: PageState = "INIT";

    constructor(private getCatalogGQL: GetCatalogGQL, private dialog: MatDialog, private route: ActivatedRoute) {}

    ngOnInit(): void {
        this.catalogSlug = this.route.snapshot.paramMap.get("catalogSlug");
        this.state = "LOADING";
        this.getCatalogGQL.fetch({ identifier: { catalogSlug: this.catalogSlug } }).subscribe(({ data }) => {
            this.catalog = data.catalog as Catalog;
            this.state = "SUCCESS";
            console.log(this.catalog);
        });
    }

    editCatalog() {
        this.dialog
            .open(EditCatalogComponent, {
                data: this.catalog
            })
            .afterClosed()
            .subscribe((newCatalog: Catalog) => {
                if (newCatalog) {
                    this.catalog = newCatalog;
                }
            });
    }
}
