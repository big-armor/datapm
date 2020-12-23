import { Component, OnInit, TemplateRef, ViewChild } from "@angular/core";
import { Catalog, MyCatalogsGQL, UpdateCatalogGQL, DeleteCatalogGQL } from "src/generated/graphql";
import { Subject } from "rxjs";
import { take, takeUntil } from "rxjs/operators";
import { MatDialog } from "@angular/material/dialog";
import { DeleteConfirmationComponent } from "../delete-confirmation/delete-confirmation.component";
import { AuthenticationService } from "src/app/services/authentication.service";
import { EditCatalogComponent } from "../../edit-catalog/edit-catalog.component";

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
    State = State;
    catalogState = State.INIT;
    public myCatalogs: Catalog[];
    private subscription = new Subject();
    columnsToDisplay = ["name", "public", "actions"];

    @ViewChild("deleteMyUsercatalog") deleteMyUsercatalog: TemplateRef<any>;

    constructor(
        private myCatalogsGQL: MyCatalogsGQL,
        private updateCatalogGQL: UpdateCatalogGQL,
        private disableCatalogGQL: DeleteCatalogGQL,
        private authenticationService: AuthenticationService,
        private dialog: MatDialog
    ) {}

    ngOnInit(): void {
        this.refreshCatalogs();
    }

    refreshCatalogs() {
        this.catalogState = State.LOADING;
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

    updateCatalogVisibility(catalog: Catalog, isPublic: boolean) {
        this.updateCatalogGQL
            .mutate({
                identifier: {
                    catalogSlug: catalog.identifier.catalogSlug
                },
                value: {
                    isPublic
                }
            })
            .subscribe(() => {});
    }

    deleteCatalog(catalog: Catalog) {
        if (catalog.identifier.catalogSlug == this.authenticationService.currentUser.value?.username) {
            this.dialog.open(this.deleteMyUsercatalog);
            return;
        }
        const dlgRef = this.dialog.open(DeleteConfirmationComponent, {
            data: {
                catalogSlug: catalog.identifier.catalogSlug
            }
        });

        dlgRef.afterClosed().subscribe((confirmed: boolean) => {
            if (confirmed) {
                this.disableCatalogGQL
                    .mutate({
                        identifier: {
                            catalogSlug: catalog.identifier.catalogSlug
                        }
                    })
                    .subscribe(() => {
                        this.myCatalogs = this.myCatalogs.filter(
                            (c) => c.identifier.catalogSlug !== catalog.identifier.catalogSlug
                        );
                    });
            }
        });
    }

    editCatalog(catalog: Catalog) {
        this.dialog
            .open(EditCatalogComponent, {
                data: catalog
            })
            .afterClosed()
            .subscribe((newCatalog: Catalog) => {
                if (newCatalog) {
                    this.myCatalogs = this.myCatalogs.map((c) =>
                        c.identifier.catalogSlug === catalog.identifier.catalogSlug ? newCatalog : c
                    );
                }
            });
    }
}
