import { Component, Inject } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { ConfirmationDialogData } from "../../../services/dialog/confirmation-dialog-data";

@Component({
    selector: "app-fancy-confirmation-dialog",
    templateUrl: "./fancy-confirmation-dialog.component.html",
    styleUrls: ["./fancy-confirmation-dialog.component.scss"]
})
export class FancyConfirmationDialogComponent {
    public title: string = "Confirm";
    public warning: string = null;
    public content: string = "Are you sure?";

    public textOrientation: string = "center";
    public confirmButtonText: string = "Confirm";
    public cancelButtonText: string = "Cancel";

    public showConfirmationInputField: boolean = false;
    public confirmationInputFieldRequiredValue: string = "";
    public confirmationInputFieldValue: string = "";

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: ConfirmationDialogData,
        public dialogRef: MatDialogRef<FancyConfirmationDialogComponent>
    ) {
        this.title = this.getOrDefault(data.title, this.title);
        this.warning = this.getOrDefault(data.warning, this.warning);
        this.content = this.getOrDefault(data.content, this.content);

        this.confirmButtonText = this.getOrDefault(data.confirmButtonText, this.confirmButtonText);
        this.cancelButtonText = this.getOrDefault(data.cancelButtonText, this.cancelButtonText);

        this.textOrientation = this.getOrDefault(data.textOrientation, this.textOrientation);

        this.showConfirmationInputField = data.showConfirmationInputField;
        this.confirmationInputFieldRequiredValue = this.getOrDefault(
            data.confirmationInputFieldRequiredValue,
            this.confirmationInputFieldRequiredValue
        );
    }

    public confirm(): void {
        this.dialogRef.close(true);
    }

    public close(): void {
        this.dialogRef.close(false);
    }

    public get shouldDisableConfirmButton(): boolean {
        return !this.shouldEnableConfirmButton;
    }

    public get shouldEnableConfirmButton(): boolean {
        if (!this.showConfirmationInputField) {
            return true;
        }

        return this.confirmationInputFieldValue === this.confirmationInputFieldRequiredValue;
    }

    private getOrDefault(value: string, defaultValue: string): string {
        if (value) {
            return value;
        }

        return defaultValue;
    }
}
