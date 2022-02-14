import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { Router } from "@angular/router";
import { Catalog, UpdateCatalogGQL, DeleteCatalogGQL, Permission } from "../../../generated/graphql";
import * as timeago from "timeago.js";
import { FormGroup, FormControl } from "@angular/forms";
import { MatSlideToggleChange } from "@angular/material/slide-toggle";
import { MatDialog } from "@angular/material/dialog";

import { DeleteCatalogComponent } from "../delete-catalog/delete-catalog.component";

import { Subject } from "rxjs";
import { EditCatalogComponent } from "../edit-catalog/edit-catalog.component";

enum State {
    INIT,
    LOADING,
    ERROR,
    SUCCESS,
    ERROR_NOT_UNIQUE,
    ERROR_NO_LABEL
}
@Component({
    selector: "app-catalog-item",
    templateUrl: "./catalog-item.component.html",
    styleUrls: ["./catalog-item.component.scss"]
})
export class CatalogItemComponent implements OnInit {

    public Permission = Permission;

    public isPublic: boolean;
    public form: FormGroup;
    private catalog: Catalog;
    private subscription = new Subject();

    @Input() item: Catalog;
    updatePublicState = State.INIT;

    @Output()
    public edited = new EventEmitter();

    @Output()
    public deleted = new EventEmitter();

    constructor(
        private router: Router,
        private updateCatalogGQL: UpdateCatalogGQL,
        private deleteCatalogGQL: DeleteCatalogGQL,
        private dialog: MatDialog
    ) {}

    ngOnInit(): void {
        this.catalog = this.item;
        this.form = new FormGroup({
            catalogIsPublic: new FormControl(this.catalog.isPublic)
        });
        this.isPublic = this.catalog.isPublic;
    }

    goToComponent(): void {
        const { catalogSlug } = this.item.identifier;
        this.router.navigate([catalogSlug]);
    }

    get truncatedDescription(): string {
        if (!this.item.description) {
            return "";
        }

        if (this.item.description.length > 220) {
            return this.item.description.substr(0, 220) + "...";
        }
        return this.item.description;
    }

    toggleCatalogIsPublic(ev: MatSlideToggleChange) {
        this.isPublic = ev.checked;
    }

    updateIsPublic() {
        if (this.form.invalid) {
            return;
        }

        let slug = this.item.identifier.catalogSlug;
        let formValueIsPublic = this.form.value.catalogIsPublic;

        this.updateCatalogGQL
            .mutate({
                identifier: {
                    catalogSlug: slug
                },
                value: {
                    isPublic: !formValueIsPublic
                }
            })
            .subscribe((response) => {
                if (response.errors?.length > 0) {
                    this.updatePublicState = State.ERROR;
                    return;
                }
                this.updatePublicState = State.SUCCESS;
            });
    }

    catalogPermission(catalog: Catalog): string {
        if (catalog.myPermissions.includes(Permission.MANAGE)) return "Manage";
        if (catalog.myPermissions.includes(Permission.EDIT)) return "Edit";
        if (catalog.myPermissions.includes(Permission.VIEW)) return "View";
        return "";
    }

    editCatalog(ev, catalog: Catalog): void {
        ev.stopPropagation();
        this.dialog
            .open(EditCatalogComponent, {
                data: catalog
            })
            .afterClosed()
            .subscribe((newCatalog: Catalog) => {
               // emit event to update catalog
               this.edited.emit(newCatalog);
            });
    }

    deleteCatalog(ev, catalog: Catalog): void {
        ev.stopPropagation();
        this.dialog
            .open(DeleteCatalogComponent, {
                data: {
                    catalogSlug: catalog.identifier.catalogSlug
                }
            })
            .afterClosed()
            .subscribe((confirmed: boolean) => {
                // emit event to update catalog list
                this.deleted.emit(confirmed);
            });
    }

    hasPermission(permission: Permission): boolean {
        return this.item.myPermissions.includes(permission);
    }

}
