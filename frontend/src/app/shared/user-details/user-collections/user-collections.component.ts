import { Component, Input, OnInit } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { CreateCollectionComponent } from "../../create-collection/create-collection.component";
import { EditCollectionComponent } from "../../edit-collection/edit-collection.component";
import { Collection, Permission, UpdateCollectionGQL, UserCollectionsGQL } from "src/generated/graphql";
import { DeleteCollectionComponent } from "../../delete-collection/delete-collection.component";
import { FewPackagesAlertComponent } from "../few-packages-alert/few-packages-alert.component";
import { Router } from "@angular/router";

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
    columnsToDisplay = ["name", "permission", "public", "actions"];
    State = State;
    state = State.INIT;
    inputErrors = {
        required: "Collection name is required"
    };

    constructor(
        private userCollections: UserCollectionsGQL,
        private updateCollectionGQL: UpdateCollectionGQL,
        private dialog: MatDialog,
        private router: Router
    ) {}

    ngOnInit(): void {
        this.loadMyCollections();
        if (!this.isCurrentUser) {
            this.columnsToDisplay = ["name"];
        }
    }

    createCollection(formValue) {
        this.dialog
            .open(CreateCollectionComponent, {
                data: formValue
            })
            .afterClosed()
            .subscribe((collection) => {
                if (collection) {
                    this.router.navigate(["/collection/" + collection.identifier.collectionSlug]);
                }
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

    public goToCollection(collection: Collection): void {
        this.router.navigate(["/collection/" + collection.identifier.collectionSlug]);
    }
}
