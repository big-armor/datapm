import { Component, Inject, OnInit } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { SnackBarService } from "src/app/services/snackBar.service";
import { DeleteCollectionGQL } from "src/generated/graphql";

export interface DeleteConfirmationData {
    collectionSlug: string;
}

type State = "INIT" | "LOADING" | "SUCCESS" | "ERROR";

@Component({
    selector: "app-delete-collection",
    templateUrl: "./delete-collection.component.html",
    styleUrls: ["./delete-collection.component.scss"]
})
export class DeleteCollectionComponent implements OnInit {
    confirmVal: string = "";
    public state: State = "INIT";
    constructor(
        @Inject(MAT_DIALOG_DATA) public data: DeleteConfirmationData,
        private dialogRef: MatDialogRef<DeleteCollectionComponent>,
        private deleteCollectionGQL: DeleteCollectionGQL,
        private snackBar: SnackBarService
    ) {}

    ngOnInit(): void {}

    confirm() {
        if (this.state === "LOADING") {
            return;
        }

        this.state = "LOADING";
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
                    this.snackBar.openSnackBar("There was an error.", "ok");
                }
            });
    }
}
