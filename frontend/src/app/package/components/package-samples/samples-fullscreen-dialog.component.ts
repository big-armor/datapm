import { Component, Inject } from "@angular/core";
import { MatDialog, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { Schema } from "datapm-lib";

@Component({
    selector: "samples-fullscreen-dialog",
    templateUrl: "./samples-fullscreen-dailog.component.html",
    styleUrls: ["./samples-fullscreen-dialog.component.scss"]
})
export class SamplesFullScreenDialog {
    public schema: Schema;
    constructor(@Inject(MAT_DIALOG_DATA) public data: { schema: Schema }, private dialog: MatDialog) {
        this.schema = data.schema;
    }
    close() {
        this.dialog.closeAll();
    }
}
