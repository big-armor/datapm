import { Component, Inject } from "@angular/core";
import { MatDialog, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { PackageFile, Schema } from "datapm-lib";
import { Package } from "src/generated/graphql";

@Component({
    selector: "samples-fullscreen-dialog",
    templateUrl: "./samples-fullscreen-dailog.component.html",
    styleUrls: ["./samples-fullscreen-dialog.component.scss"]
})
export class SamplesFullScreenDialog {
    public schema: Schema;
    public packageFile: PackageFile;
    public package: Package;
    constructor(
        @Inject(MAT_DIALOG_DATA) public data: { schema: Schema; packageFile: PackageFile; package: Package },
        private dialog: MatDialog
    ) {
        this.schema = data.schema;
        this.packageFile = data.packageFile;
        this.package = data.package;
    }
    close() {
        this.dialog.closeAll();
    }
}
