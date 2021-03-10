import { Component, Inject, OnInit } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { SnackBarService } from "src/app/services/snackBar.service";
import { DeleteCatalogGQL } from "src/generated/graphql";

export interface DeleteCatalogData {
    catalogSlug: string;
}

type State = "INIT" | "LOADING" | "SUCCESS" | "ERROR";

@Component({
    selector: "app-delete-catalog",
    templateUrl: "./delete-catalog.component.html",
    styleUrls: ["./delete-catalog.component.scss"]
})
export class DeleteCatalogComponent implements OnInit {
    confirmVal: string = "";
    public state: State = "INIT";
    type: string;
    constructor(
        @Inject(MAT_DIALOG_DATA) public data: DeleteCatalogData,
        private dialogRef: MatDialogRef<DeleteCatalogComponent>,
        private deleteCatalogGQL: DeleteCatalogGQL,
        private snackBar: SnackBarService
    ) {}

    ngOnInit(): void {}

    confirm() {
        if (this.state === "LOADING") {
            return;
        }

        this.state = "LOADING";
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
                    this.snackBar.openSnackBar("There was an error.", "ok");
                }
            });
    }
}
