import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { Router } from "@angular/router";
import { Collection, UpdateCollectionGQL, DeleteCollectionGQL, Permission } from "../../../generated/graphql";
import * as timeago from "timeago.js";
import { FormGroup, FormControl } from "@angular/forms";
import { MatSlideToggleChange } from "@angular/material/slide-toggle";
import { MatDialog } from "@angular/material/dialog";

import { DeleteCollectionComponent } from "../delete-collection/delete-collection.component";

import { Subject } from "rxjs";
import { EditCollectionComponent } from "../edit-collection/edit-collection.component";

enum State {
    INIT,
    LOADING,
    ERROR,
    SUCCESS,
    ERROR_NOT_UNIQUE,
    ERROR_NO_LABEL
}
@Component({
    selector: "app-collection-item",
    templateUrl: "./collection-item.component.html",
    styleUrls: ["./collection-item.component.scss"]
})
export class CollectionItemComponent implements OnInit {

    public Permission = Permission;

    public isPublic: boolean;
    public form: FormGroup;
    private collection: Collection;
    private subscription = new Subject();
    @Input() item: Collection;
    updatePublicState = State.INIT;

    @Output()
    public edited = new EventEmitter();

    @Output()
    public deleted = new EventEmitter();

    constructor(
        private router: Router,
        private updateCollectionGQL: UpdateCollectionGQL,
        private deleteCollectionGQL: DeleteCollectionGQL,
        private dialog: MatDialog
    ) {}

    ngOnInit(): void {
        this.collection = this.item;
        this.form = new FormGroup({
            collectionIsPublic: new FormControl(this.collection.isPublic)
        });
        this.isPublic = this.collection.isPublic;
    }

    goToComponent(): void {
        const { collectionSlug } = this.item.identifier;
        this.router.navigate([collectionSlug]);
    }

    get lastActivityLabel(): string {
        return timeago.format(this.item.updatedAt);
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

    toggleCollectionIsPublic(ev: MatSlideToggleChange) {
        this.isPublic = ev.checked;
    }

    updateIsPublic() {
        if (this.form.invalid) {
            return;
        }

        let slug = this.item.identifier.collectionSlug;
        let formValueIsPublic = this.form.value.collectionIsPublic;

        this.updateCollectionGQL
            .mutate({
                identifier: {
                    collectionSlug: slug
                },
                value: {
                    isPublic: !formValueIsPublic
                }
            })
            .subscribe((response) => {
                if (response.errors?.length > 0) {
                    if (response.errors.find((e) => e.message == "COLLECTION_IS_PUBLIC CANNOT BE UPDATED")) {
                        this.updatePublicState = State.ERROR_NOT_UNIQUE;
                        return;
                    }
                    this.updatePublicState = State.ERROR;
                    return;
                }
                this.updatePublicState = State.SUCCESS;
            });
    }

    collectionPermission(collection: Collection): string {
        if (collection.myPermissions.includes(Permission.MANAGE)) return "Manage";
        if (collection.myPermissions.includes(Permission.EDIT)) return "Edit";
        if (collection.myPermissions.includes(Permission.VIEW)) return "View";
        return "";
    }

    editCollection(ev, collection: Collection): void {
        ev.stopPropagation();
        this.dialog
            .open(EditCollectionComponent, {
                data: collection
            })
            .afterClosed()
            .subscribe((newCollection: Collection) => {
               // emit event to update collection
               this.edited.emit(newCollection);
            });
    }

    deleteCollection(ev, collection: Collection): void {
        ev.stopPropagation();
        this.dialog
            .open(DeleteCollectionComponent, {
                data: {
                    collectionSlug: collection.identifier.collectionSlug
                }
            })
            .afterClosed()
            .subscribe((confirmed: boolean) => {
                // emit event to update collection list
                this.deleted.emit(confirmed);
            });
    }

    hasPermission(permission: Permission): boolean {
        return this.item.myPermissions.includes(permission);
    }

}
