import { Component, Inject, OnInit } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { SnackBarService } from "src/app/services/snackBar.service";
import { DeleteGroupGQL } from "src/generated/graphql";

export interface DeleteGroupData {
    groupSlug: string;
}

type State = "INIT" | "LOADING" | "SUCCESS" | "ERROR";

@Component({
    selector: "app-delete-group",
    templateUrl: "./delete-group.component.html",
    styleUrls: ["./delete-group.component.scss"]
})
export class DeleteGroupComponent implements OnInit {
    confirmVal: string = "";
    public state: State = "INIT";
    type: string;
    constructor(
        @Inject(MAT_DIALOG_DATA) public data: DeleteGroupData,
        private dialogRef: MatDialogRef<DeleteGroupComponent>,
        private deleteGroupGQL: DeleteGroupGQL,
        private snackBar: SnackBarService
    ) {}

    ngOnInit(): void {
        this.state == "SUCCESS"
    }

    confirm() {
        if (this.state === "LOADING") {
            return;
        }

        this.state = "LOADING";
        this.deleteGroupGQL
            .mutate({
                groupSlug: this.data.groupSlug
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
