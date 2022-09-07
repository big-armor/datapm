import { Component, Inject, OnInit } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { Group, SetGroupAsAdminGQL } from "src/generated/graphql";

class ModalData {
    group: Group;
    isAdmin: boolean;
}

@Component({
    selector: "app-group-admin-confirmation",
    templateUrl: "./admin-status-confirmation.component.html",
    styleUrls: ["./admin-status-confirmation.component.scss"]
})
export class GroupAdminConfirmationComponent implements OnInit {
    public hasErrors = false;

    constructor(
        @Inject(MAT_DIALOG_DATA) public modalData: ModalData,
        private setGroupAsAdminGQL: SetGroupAsAdminGQL,
        public dialogRef: MatDialogRef<GroupAdminConfirmationComponent>
    ) {}

    ngOnInit(): void {}

    public confirmSave(): void {
        this.hasErrors = false;
        this.setGroupAsAdminGQL
            .mutate({
                groupSlug: this.modalData.group.slug,
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
