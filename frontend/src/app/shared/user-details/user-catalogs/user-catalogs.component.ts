import { Component, Input, OnInit, TemplateRef, ViewChild } from "@angular/core";
import { Catalog, UpdateCatalogGQL, DeleteCatalogGQL, UserCatalogsGQL } from "src/generated/graphql";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { MatDialog } from "@angular/material/dialog";
import { AuthenticationService } from "src/app/services/authentication.service";
import { EditCatalogComponent } from "../../edit-catalog/edit-catalog.component";
import { CreateCatalogComponent } from "../../create-catalog/create-catalog.component";
import { DeleteCatalogComponent } from "../../delete-catalog/delete-catalog.component";
import { DialogService } from "../../../services/dialog/dialog.service";
import { MatSlideToggle, MatSlideToggleChange } from "@angular/material/slide-toggle";

enum State {
    INIT,
    LOADING,
    ERROR,
    SUCCESS,
    ERROR_NOT_UNIQUE,
    ERROR_NO_LABEL
}
@Component({
    selector: "app-user-catalogs",
    templateUrl: "./user-catalogs.component.html",
    styleUrls: ["./user-catalogs.component.scss"]
})
export class UserCatalogsComponent implements OnInit {
    @Input() username: string;
    @Input() isCurrentUser: boolean;

    State = State;
    catalogState = State.INIT;
    public myCatalogs: Catalog[];
    private subscription = new Subject();
    columnsToDisplay = ["name", "public", "actions"];
    inputErrors = {
        required: "Catalog name is required"
    };

    @ViewChild("deleteMyUsercatalog") deleteMyUsercatalog: TemplateRef<any>;

    constructor(
        private userCatalogs: UserCatalogsGQL,
        private updateCatalogGQL: UpdateCatalogGQL,
        private deleteCatalogGQL: DeleteCatalogGQL,
        private authenticationService: AuthenticationService,
        private dialog: MatDialog,
        private dialogService: DialogService
    ) {}

    public ngOnInit(): void {
        this.refreshCatalogs();
        if (!this.isCurrentUser) {
            this.columnsToDisplay = ["name"];
        }
    }

    public refreshCatalogs(): void {
        this.catalogState = State.LOADING;
        this.userCatalogs
            .fetch({ username: this.username, offSet: 0, limit: 1000 })
            .pipe(takeUntil(this.subscription))
            .subscribe((response) => {
                if (response.errors?.length > 0) {
                    this.catalogState = State.ERROR;
                    return;
                }
                this.myCatalogs = response.data.userCatalogs.catalogs as Catalog[];
                this.catalogState = State.SUCCESS;
            });
    }

    public createCatalog(formValue): void {
        this.dialog
            .open(CreateCatalogComponent, {
                data: formValue
            })
            .afterClosed()
            .subscribe((data) => {
                if (data) {
                    this.refreshCatalogs();
                }
            });
    }

    public deleteCatalog(catalog: Catalog): void {
        if (!this.canModifyCatalog(catalog.identifier.catalogSlug)) {
            return;
        }

        if (catalog.identifier.catalogSlug == this.authenticationService.currentUser.value?.username) {
            this.dialog.open(this.deleteMyUsercatalog);
            return;
        }
        const dlgRef = this.dialog.open(DeleteCatalogComponent, {
            data: {
                catalogSlug: catalog.identifier.catalogSlug
            }
        });

        dlgRef.afterClosed().subscribe((confirmed: boolean) => {
            if (confirmed) {
                this.refreshCatalogs();
            }
        });
    }

    public editCatalog(catalog: Catalog): void {
        if (!this.canModifyCatalog(catalog.identifier.catalogSlug)) {
            return;
        }

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

    public canModifyCatalog(catalogSlug: string): boolean {
        return catalogSlug && catalogSlug !== this.username;
    }

    public updateCatalogVisibility(catalog: Catalog, changeEvent: MatSlideToggleChange): void {
        this.dialogService.openCatalogVisibilityChangeConfirmationDialog(changeEvent.checked).subscribe((confirmed) => {
            if (confirmed) {
                this.executeUpdateOnCatalogVisibility(catalog, changeEvent.checked);
            } else {
                changeEvent.source.writeValue(!changeEvent.checked);
            }
        });
    }

    private executeUpdateOnCatalogVisibility(catalog: Catalog, isPublic: boolean): void {
        this.updateCatalogGQL
            .mutate({
                identifier: {
                    catalogSlug: catalog.identifier.catalogSlug
                },
                value: {
                    isPublic
                }
            })
            .subscribe(() => (catalog.isPublic = isPublic));
    }
}
