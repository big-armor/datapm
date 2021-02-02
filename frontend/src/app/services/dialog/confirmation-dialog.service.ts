import { Injectable } from "@angular/core";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { FancyConfirmationDialogComponent } from "../../shared/dialogs/fancy-confirmation-dialog/fancy-confirmation-dialog.component";
import { DialogData } from "./dialog-data";
import { map } from "rxjs/operators";
import { Observable } from "rxjs";
import { DialogDimensionsCalculator } from "./dialog-dimensions-calculator";
import { DialogSize } from "./dialog-size";
import { DialogConfig } from "./dialog-config";

@Injectable({
    providedIn: "root"
})
export class ConfirmationDialogService {
    public constructor(private dialog: MatDialog) {}

    public openFancyConfirmationDialog(config: DialogConfig): Observable<boolean> {
        const matDialogConfig = this.buildDialogConfig(config.data, config.size);
        return this.dialog
            .open(FancyConfirmationDialogComponent, matDialogConfig)
            .afterClosed()
            .pipe(map((confirmation) => !!confirmation));
    }

    private buildDialogConfig(data: DialogData, dialogSize: DialogSize): MatDialogConfig {
        const dimensions = DialogDimensionsCalculator.calculate(dialogSize);
        return {
            data,
            width: dimensions.x + "px"
        };
    }
}
