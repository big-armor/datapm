import { Component, Input, OnInit, SimpleChanges } from "@angular/core";
import { MatSlideToggleChange } from "@angular/material/slide-toggle";
import { Collection, Permission, UpdateCollectionGQL, UsersByCollectionGQL } from "src/generated/graphql";

@Component({
    selector: "app-collection-permissions",
    templateUrl: "./collection-permissions.component.html",
    styleUrls: ["./collection-permissions.component.scss"]
})
export class CollectionPermissionsComponent implements OnInit {
    @Input() collection: Collection;

    public columnsToDisplay = ["name", "permission", "actions"];
    public users: any[] = [
        { name: "Tony Lee", permission: Permission.VIEW },
        { name: "John Doe", permission: Permission.EDIT }
    ];

    constructor(private usersByCollection: UsersByCollectionGQL, private updateCollectionGQL: UpdateCollectionGQL) {}

    ngOnInit(): void {}

    ngOnChanges(changes: SimpleChanges) {
        if (changes.collection && changes.collection.currentValue) {
            this.collection = changes.collection.currentValue;
            this.getUserList();
        }
    }

    private getUserList() {
        if (!this.collection) {
            return;
        }

        this.usersByCollection
            .watch({
                identifier: {
                    collectionSlug: this.collection.identifier.collectionSlug
                }
            })
            .valueChanges.subscribe(({ data }) => {});
    }

    public updatePublic(ev: MatSlideToggleChange) {
        this.updateCollectionGQL
            .mutate({
                identifier: {
                    collectionSlug: this.collection.identifier.collectionSlug
                },
                value: {
                    isPublic: ev.checked
                }
            })
            .subscribe(({ data }) => {
                this.collection = data.updateCollection as Collection;
            });
    }
}
