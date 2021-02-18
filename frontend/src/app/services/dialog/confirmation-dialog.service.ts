import { Injectable } from "@angular/core";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { FancyConfirmationDialogComponent } from "../../shared/dialogs/fancy-confirmation-dialog/fancy-confirmation-dialog.component";
import { UserStatusChangeConfirmationDialogComponent } from "../../shared/dialogs/user-status-change-confirmation-dialog/user-status-change-confirmation-dialog.component";
import { ConfirmationDialogData } from "./confirmation-dialog-data";
import { map } from "rxjs/operators";
import { Observable } from "rxjs";
import { DialogDimensionsCalculator } from "./dialog-dimensions-calculator";
import { DialogSize } from "./dialog-size";
import { ConfirmationDialogConfig } from "./confirmation-dialog-config";
import { DialogConfig } from "./dialog-config";
import { UserStatusChangeDialogResponse } from "./user-status-change-dialog-response";

@Injectable({
    providedIn: "root"
})
export class ConfirmationDialogService {
    public constructor(private dialog: MatDialog) {}

    public openUserStatusChangeConfirmationDialog(config: DialogConfig): Observable<UserStatusChangeDialogResponse> {
        const matDialogConfig = this.buildDialogConfig(config.data, config.size);
        return this.dialog.open(UserStatusChangeConfirmationDialogComponent, matDialogConfig).afterClosed();
    }

    public openFancyConfirmationDialog(config: ConfirmationDialogConfig): Observable<boolean> {
        const matDialogConfig = this.buildDialogConfig(config.data, config.size);
        return this.dialog
            .open(FancyConfirmationDialogComponent, matDialogConfig)
            .afterClosed()
            .pipe(map((confirmation) => !!confirmation));
    }

    private buildDialogConfig(data: ConfirmationDialogData, dialogSize: DialogSize): MatDialogConfig {
        const dimensions = DialogDimensionsCalculator.calculate(dialogSize);
        return {
            data,
            width: dimensions.x + "px"
        };
    }
}
