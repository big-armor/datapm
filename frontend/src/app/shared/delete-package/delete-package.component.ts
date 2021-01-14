import { Component, Inject, OnInit } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { SnackBarService } from "src/app/services/snackBar.service";
import { DeleteCollectionGQL, DeletePackageGQL } from "src/generated/graphql";

export interface DeletePackageData {
    catalogSlug: string;
    packageSlug: string;
    dontDeleteInstantly?: boolean;
}

@Component({
    selector: "app-delete-package",
    templateUrl: "./delete-package.component.html",
    styleUrls: ["./delete-package.component.scss"]
})
export class DeletePackageComponent {
    public confirmVal: string = "";

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: DeletePackageData,
        private dialogRef: MatDialogRef<DeletePackageComponent>,
        private deletePackageGQL: DeletePackageGQL,
        private snackBar: SnackBarService
    ) {}

    public confirm(): void {
        if (this.data.dontDeleteInstantly) {
            this.dialogRef.close(true);
            return;
        }

        this.deletePackageGQL
            .mutate({
                identifier: {
                    catalogSlug: this.data.catalogSlug,
                    packageSlug: this.data.packageSlug
                }
            })
            .subscribe((response) => {
                if (!response.errors) {
                    this.dialogRef.close(true);
                } else {
                    this.snackBar.openSnackBar("There was an error. Please try again later", "ok");
                }
            });
    }
}
