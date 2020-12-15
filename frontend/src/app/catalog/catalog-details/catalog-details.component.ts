import { Component, OnInit } from "@angular/core";
import { Catalog, GetCatalogGQL, GetCatalogQuery, Permission } from "src/generated/graphql";
import { ActivatedRoute } from "@angular/router";
import { MatDialog } from "@angular/material/dialog";
import { EditCatalogComponent } from "src/app/shared/edit-catalog/edit-catalog.component";

@Component({
    selector: "app-catalog-details",
    templateUrl: "./catalog-details.component.html",
    styleUrls: ["./catalog-details.component.scss"]
})
export class CatalogDetailsComponent implements OnInit {
    catalog: Catalog;
    canEdit: boolean;

    constructor(private getCatalogGQL: GetCatalogGQL, private dialog: MatDialog, private route: ActivatedRoute) {}

    ngOnInit(): void {
        const catalogSlug = this.route.snapshot.paramMap.get("catalogSlug");
        this.getCatalogGQL.fetch({ identifier: { catalogSlug } }).subscribe(({ data }) => {
            this.catalog = data.catalog as Catalog;
            this.canEdit = this.catalog?.myPermissions?.includes(Permission.EDIT);
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
