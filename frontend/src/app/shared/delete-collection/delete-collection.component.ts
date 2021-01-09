import { Component, Inject, OnInit } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { DeleteCollectionGQL } from "src/generated/graphql";

export interface DeleteConfirmationData {
    collectionSlug: string;
}

@Component({
    selector: "app-delete-collection",
    templateUrl: "./delete-collection.component.html",
    styleUrls: ["./delete-collection.component.scss"]
})
export class DeleteCollectionComponent implements OnInit {
    confirmVal: string = "";
    constructor(
        @Inject(MAT_DIALOG_DATA) public data: DeleteConfirmationData,
        private dialogRef: MatDialogRef<DeleteCollectionComponent>,
        private deleteCollectionGQL: DeleteCollectionGQL
    ) {}

    ngOnInit(): void {}

    confirm() {
        this.deleteCollectionGQL
            .mutate({
                identifier: {
                    collectionSlug: this.data.collectionSlug
                }
            })
            .subscribe((response) => {
                if (!response.errors) this.dialogRef.close(true);
                else {
                    console.error(response);
                }
            });
    }
}
