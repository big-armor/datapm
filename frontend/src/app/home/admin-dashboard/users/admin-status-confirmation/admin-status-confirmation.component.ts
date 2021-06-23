import { Component, Inject, OnInit } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { SetAsAdminGQL } from "src/generated/graphql";

class ModalData {
    username: string;
    isAdmin: boolean;
}

@Component({
    selector: "app-admin-status-confirmation",
    templateUrl: "./admin-status-confirmation.component.html",
    styleUrls: ["./admin-status-confirmation.component.scss"]
})
export class AdminStatusConfirmationComponent implements OnInit {
    public hasErrors = false;

    constructor(
        @Inject(MAT_DIALOG_DATA) public modalData: ModalData,
        private setAsAdminGQL: SetAsAdminGQL,
        public dialogRef: MatDialogRef<AdminStatusConfirmationComponent>
    ) {}

    ngOnInit(): void {}

    public confirmSave(): void {
        this.hasErrors = false;
        this.setAsAdminGQL
            .mutate({
                username: this.modalData.username,
                isAdmin: this.modalData.isAdmin
            })
            .subscribe(
                ({ errors }) => {
                    if (errors) {
                        this.hasErrors = true;
                    } else {
                        this.dialogRef.close(true);
                    }
                },
                (errors) => {
                    this.hasErrors = true;
                }
            );
    }

    public cancel(): void {
        this.dialogRef.close(false);
    }
}
