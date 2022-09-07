import { Component, Input, OnInit, TemplateRef, ViewChild } from "@angular/core";
import { Catalog, UpdateCatalogGQL, DeleteCatalogGQL, UserCatalogsGQL, Permission } from "src/generated/graphql";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { MatDialog } from "@angular/material/dialog";
import { AuthenticationService } from "src/app/services/authentication.service";
import { EditCatalogComponent } from "../../edit-catalog/edit-catalog.component";
import { CreateCatalogComponent } from "../../create-catalog/create-catalog.component";
import { DeleteCatalogComponent } from "../../delete-catalog/delete-catalog.component";
import { DialogService } from "../../../services/dialog/dialog.service";
import { MatSlideToggle, MatSlideToggleChange } from "@angular/material/slide-toggle";
import { FormControl } from "@angular/forms";
import { Router } from "@angular/router";

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
    public otherCatalogs: Catalog[];
    private subscription = new Subject();
    columnsToDisplay = ["name", "permission", "public", "actions"];
    inputErrors = {
        required: "Catalog name is required"
    };

    Permission = Permission;

    message = new FormControl("You can not delete your username catalog.");

    @ViewChild("deleteMyUsercatalog") deleteMyUsercatalog: TemplateRef<any>;

    constructor(
        private userCatalogs: UserCatalogsGQL,
        private updateCatalogGQL: UpdateCatalogGQL,
        private authenticationService: AuthenticationService,
        private dialog: MatDialog,
        private dialogService: DialogService,
        private router: Router
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

    public deleteCatalog(ev: Event, catalog: Catalog): void {
        ev.stopPropagation();
        if (!this.canManageCatalog(catalog)) {
            return;
        }

        if (catalog.identifier.catalogSlug == this.authenticationService.currentUser.value?.user.username) {
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

    public editCatalog(ev: Event, catalog: Catalog): void {
        ev.stopPropagation();
        if (!this.canModifyCatalog(catalog)) {
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

    public canModifyCatalog(catalog: Catalog): boolean {
        return (
            catalog &&
            catalog.identifier.catalogSlug !== this.username &&
            catalog.myPermissions?.includes(Permission.EDIT)
        );
    }

    public canManageCatalog(catalog: Catalog): boolean {
        return catalog && catalog.myPermissions?.includes(Permission.MANAGE);
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

    catalogPermission(collection: Catalog): string {
        if (collection.myPermissions.includes(Permission.MANAGE)) return "Manage";
        if (collection.myPermissions.includes(Permission.EDIT)) return "Edit";
        if (collection.myPermissions.includes(Permission.VIEW)) return "View";
        return "";
    }

    public clickCatalog(catalog: Catalog): void {
        this.router.navigate([catalog.identifier.catalogSlug]);
    }
}
