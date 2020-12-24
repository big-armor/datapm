import { Component, Input, OnInit } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { CreateCollectionComponent } from "../../create-collection/create-collection.component";
import { EditCollectionComponent } from "../../edit-collection/edit-collection.component";
import {
    Collection,
    DeleteCollectionGQL,
    MyCollectionsGQL,
    UpdateCollectionGQL,
    UserCollectionsGQL
} from "src/generated/graphql";
import { DeleteConfirmationComponent } from "../delete-confirmation/delete-confirmation.component";
import { FewPackagesAlertComponent } from "../few-packages-alert/few-packages-alert.component";

enum State {
    INIT,
    LOADING,
    ERROR,
    SUCCESS
}

@Component({
    selector: "app-user-collections",
    templateUrl: "./user-collections.component.html",
    styleUrls: ["./user-collections.component.scss"]
})
export class UserCollectionsComponent implements OnInit {
    @Input() username: string;
    @Input() isCurrentUser: boolean;

    public collections: Collection[] = [];
    columnsToDisplay = ["name", "public", "actions"];
    State = State;
    state = State.INIT;
    inputErrors = {
        required: "Collection name is required"
    };

    constructor(
        private userCollections: UserCollectionsGQL,
        private updateCollectionGQL: UpdateCollectionGQL,
        private deleteCollectionGQL: DeleteCollectionGQL,
        private dialog: MatDialog
    ) {}

    ngOnInit(): void {
        this.loadMyCollections();
        if (!this.isCurrentUser) {
            this.columnsToDisplay = ["name"];
        }
    }

    openCreateDialog() {
        this.dialog
            .open(CreateCollectionComponent)
            .afterClosed()
            .subscribe(() => {
                this.loadMyCollections();
            });
    }

    createCollection(formValue) {
        this.dialog
            .open(CreateCollectionComponent, {
                data: formValue
            })
            .afterClosed()
            .subscribe(() => {
                this.loadMyCollections();
            });
    }

    private loadMyCollections(): void {
        // Need to set a dynamic limit for future / pagination
        this.state = State.LOADING;
        this.userCollections.fetch({ username: this.username, offSet: 0, limit: 100 }).subscribe(
            (a) => {
                this.collections = a.data.userCollections.collections as Collection[];
                this.state = State.SUCCESS;
            },
            () => {
                this.state = State.ERROR;
            }
        );
    }

    updateCollectionVisibility(collection: Collection, checked: boolean): void {
        this.updateCollectionGQL
            .mutate({
                identifier: {
                    collectionSlug: collection.identifier.collectionSlug
                },
                value: {
                    isPublic: checked
                }
            })
            .subscribe((response) => {
                if (response.errors) {
                    const error = response.errors.find((e) => e.message === "TOO_FEW_PACKAGES");
                    if (error) {
                        this.dialog.open(FewPackagesAlertComponent);
                    }
                    collection.isPublic = !checked;
                    return;
                }

                const newCollection = response.data.updateCollection as Collection;
                this.collections = this.collections.map((collection) =>
                    collection.identifier.collectionSlug === newCollection.identifier.collectionSlug
                        ? newCollection
                        : collection
                );
            });
    }

    editCollection(collection: Collection): void {
        this.dialog
            .open(EditCollectionComponent, {
                data: collection
            })
            .afterClosed()
            .subscribe((newCollection: Collection) => {
                if (newCollection) {
                    this.collections = this.collections.map((c) =>
                        c.identifier.collectionSlug === collection.identifier.collectionSlug ? newCollection : c
                    );
                }
            });
    }

    deleteCollection(collection: Collection): void {
        this.dialog
            .open(DeleteConfirmationComponent, {
                data: {
                    collectionSlug: collection.identifier.collectionSlug
                }
            })
            .afterClosed()
            .subscribe((confirmed: boolean) => {
                if (confirmed) {
                    this.state = State.LOADING;
                    const prevCollections = this.collections;
                    this.collections = this.collections.filter(
                        (c) => c.identifier.collectionSlug !== collection.identifier.collectionSlug
                    );
                    this.deleteCollectionGQL
                        .mutate({
                            identifier: {
                                collectionSlug: collection.identifier.collectionSlug
                            }
                        })
                        .subscribe(
                            (response) => {
                                if (response.errors?.length > 0) {
                                    this.state = State.ERROR;
                                    this.collections = prevCollections;
                                    return;
                                }

                                this.state = State.SUCCESS;
                            },
                            () => {
                                this.state = State.ERROR;
                                this.collections = prevCollections;
                            }
                        );
                }
            });
    }
}
