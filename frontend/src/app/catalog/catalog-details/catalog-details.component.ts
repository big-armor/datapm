import { Component, OnInit } from "@angular/core";
import { Catalog, GetCatalogGQL, Package, Permission } from "src/generated/graphql";
import { ActivatedRoute, Router } from "@angular/router";
import { MatDialog } from "@angular/material/dialog";
import { EditCatalogComponent } from "src/app/shared/edit-catalog/edit-catalog.component";
import { PageState } from "src/app/models/page-state";
import { DialogService } from "../../services/dialog.service";
import { DeletePackageComponent } from "../../shared/delete-package/delete-package.component";

@Component({
    selector: "app-catalog-details",
    templateUrl: "./catalog-details.component.html",
    styleUrls: ["./catalog-details.component.scss"]
})
export class CatalogDetailsComponent implements OnInit {
    public catalogSlug = "";
    public catalog: Catalog;
    public state: PageState | "CATALOG_NOT_FOUND" | "NOT_AUTHENTICATED" = "INIT";
    public currentTab = 0;

    constructor(
        private getCatalogGQL: GetCatalogGQL,
        private dialog: MatDialog,
        private router: Router,
        private route: ActivatedRoute,
        private dialogService: DialogService
    ) {}

    public ngOnInit(): void {
        this.catalogSlug = this.route.snapshot.paramMap.get("catalogSlug");
        this.state = "LOADING";
        this.getCatalogGQL.fetch({ identifier: { catalogSlug: this.catalogSlug } }).subscribe(({ data, errors }) => {
            if (errors) {
                if (errors.find((e) => e.message.includes("CATALOG_NOT_FOUND"))) {
                    this.state = "CATALOG_NOT_FOUND";
                } else if (errors.find((e) => e.message.includes("NOT_AUTHENTICATED"))) {
                    this.state = "NOT_AUTHENTICATED";
                } else {
                    this.state = "ERROR";
                }
                return;
            }

            this.catalog = data.catalog as Catalog;
            this.state = "SUCCESS";
        });
    }

    public editCatalog(): void {
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

    public loginClicked(): void {
        this.dialogService.openLoginDialog();
    }

    public deletePackage(packageToDelete: Package): void {
        const dialogConfig = {
            data: {
                catalogSlug: packageToDelete.identifier.catalogSlug,
                packageSlug: packageToDelete.identifier.packageSlug,
                dontDeleteInstantly: true
            }
        };
        const dialogReference = this.dialog.open(DeletePackageComponent, dialogConfig);

        dialogReference.afterClosed().subscribe((confirmed: boolean) => {
            if (confirmed) {
                const deletionRoutePathFragments = [
                    packageToDelete.identifier.catalogSlug,
                    packageToDelete.identifier.packageSlug,
                    "delete-confirmation"
                ];
                this.router.navigate(deletionRoutePathFragments);
            }
        });
    }

    public get canManage(): boolean {
        return this.catalog && this.catalog.myPermissions?.includes(Permission.MANAGE);
    }

    public get canEdit(): boolean {
        return this.catalog && this.catalog.myPermissions?.includes(Permission.EDIT);
    }
}
