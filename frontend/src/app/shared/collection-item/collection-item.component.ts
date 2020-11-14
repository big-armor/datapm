import { Component, Input, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { Collection, UpdateCollectionGQL, DeleteCollectionGQL } from "../../../generated/graphql";
import * as timeago from "timeago.js";
import { FormGroup, FormControl } from "@angular/forms";
import { MatSlideToggleChange } from "@angular/material/slide-toggle";
import { MatDialog } from "@angular/material/dialog";

import { DeleteConfirmationComponent } from "../../my-account/delete-confirmation/delete-confirmation.component";

import { Subject } from "rxjs";

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
    public isPublic: boolean;
    public form: FormGroup;
    private collection: Collection;
    private subscription = new Subject();
    @Input() item: Collection;
    @Input() hasImage: boolean;
    updatePublicState = State.INIT;
    deleteCollectionState = State.INIT;

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

    deleteCollection() {
        const dialog = this.dialog.open(DeleteConfirmationComponent, {
            data: {
                collectionSlug: this.item.identifier.collectionSlug
            }
        });

        dialog.afterClosed().subscribe((confirmed: boolean) => {
            if (confirmed) {
                this.deleteCollectionGQL
                    .mutate({
                        identifier: {
                            collectionSlug: this.item.identifier.collectionSlug
                        }
                    })
                    .subscribe(() => {
                        location.reload();
                        this.deleteCollectionState = State.SUCCESS;
                    });
            }
        });
    }
}
