import { Component, Inject, Input, OnInit } from "@angular/core";
import { FormControl } from "@angular/forms";
import { MAT_DIALOG_DATA } from "@angular/material/dialog";
import { Schema } from "datapm-lib";

export interface PropertyDialogData {
    schema: Schema;
    property: Schema;
}

@Component({
    selector: "app-edit-property-dialog",
    templateUrl: "./edit-property-dialog.component.html",
    styleUrls: ["./edit-property-dialog.component.scss"]
})
export class EditPropertyDialogComponent {
    public selectedProperty: Schema;
    public selectedPropertyTitle: string;
    public properties: Schema[] = [];

    public titleControl = new FormControl();
    public description: string;
    public unit: string;

    constructor(@Inject(MAT_DIALOG_DATA) public data: PropertyDialogData) {
        if (data) {
            this.properties = Object.values(data.schema.properties);

            this.selectedProperty = data.property;
            this.updateSelectedProperty();
        }
    }

    public updateSelectedProperty(): void {
        this.selectedPropertyTitle = this.selectedProperty.title;
        this.titleControl.setValue(this.selectedPropertyTitle);
        this.description = this.selectedProperty.description;
        this.unit = this.selectedProperty.unit;
    }
}
