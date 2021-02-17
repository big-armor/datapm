import { Component, Inject } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { User, UserStatus } from "src/generated/graphql";
import { UserStatusChangeDialogResponse } from "src/app/services/dialog/user-status-change-dialog-response";

@Component({
    selector: "app-user-status-change-confirmation-dialog",
    templateUrl: "./user-status-change-confirmation-dialog.component.html",
    styleUrls: ["./user-status-change-confirmation-dialog.component.scss"]
})
export class UserStatusChangeConfirmationDialogComponent {
    public readonly UserStatus = UserStatus;

    public message: string = "";
    public status: UserStatus;

    public loading = false;

    public constructor(
        @Inject(MAT_DIALOG_DATA) public user: User,
        private dialogRef: MatDialogRef<UserStatusChangeConfirmationDialogComponent>
    ) {
        this.status = user.status || UserStatus.ACTIVE;
    }

    public confirm(): void {
        this.close(true);
    }

    public cancel(): void {
        this.close(false);
    }

    private close(confirmed: boolean): void {
        const response = confirmed
            ? ({ status: this.status, message: this.message } as UserStatusChangeDialogResponse)
            : null;
        this.dialogRef.close(response);
    }
}
