import { Component, Inject, OnInit } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { DeleteCatalogGQL } from "src/generated/graphql";

export interface DeleteCatalogData {
    catalogSlug: string;
}

@Component({
    selector: "app-delete-catalog",
    templateUrl: "./delete-catalog.component.html",
    styleUrls: ["./delete-catalog.component.scss"]
})
export class DeleteCatalogComponent implements OnInit {
    confirmVal: string = "";
    type: string;
    constructor(
        @Inject(MAT_DIALOG_DATA) public data: DeleteCatalogData,
        private dialogRef: MatDialogRef<DeleteCatalogComponent>,
        private deleteCatalogGQL: DeleteCatalogGQL
    ) {}

    ngOnInit(): void {}

    confirm() {
        this.deleteCatalogGQL
            .mutate({
                identifier: {
                    catalogSlug: this.data.catalogSlug
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
