import { COMMA, ENTER } from "@angular/cdk/keycodes";
import { Component, Inject, Input, OnInit } from "@angular/core";
import { FormControl } from "@angular/forms";
import { MatAutocompleteSelectedEvent } from "@angular/material/autocomplete";
import { MatChipInputEvent } from "@angular/material/chips";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { cloneDeep } from "@apollo/client/utilities";
import {
    comparePackages,
    ContentLabel,
    diffCompatibility,
    nextVersion,
    PackageFile,
    Property,
    Schema,
    ValueTypes,
    ValueTypeStatistics
} from "datapm-lib";
import { SemVer } from "semver/classes";
import { PackageService } from "src/app/package/services/package.service";
import { CreateVersionGQL, Package } from "src/generated/graphql";

export interface PropertyDialogData {
    schema: Schema;
    property: Schema;
    packageFile: PackageFile;
    package: Package;
}

@Component({
    selector: "app-edit-property-dialog",
    templateUrl: "./edit-property-dialog.component.html",
    styleUrls: ["./edit-property-dialog.component.scss"]
})
export class EditPropertyDialogComponent {
    public readonly CHIP_SEPARATOR_KEY_CODES: number[] = [ENTER, COMMA];

    public selectedProperty: Property;
    public selectedPropertyTitle: string;
    public properties: Property[] = [];
    public package: Package;
    public packageFile: PackageFile;
    public schema: Schema;

    public valueTypesObject: ValueTypes;
    public valueTypes = [];
    public valueTypeValues:ValueTypeStatistics[] = [];
    public valueTypesForType: { [key: string]: ContentLabel[] } = {};

    public contentLabels: ContentLabel[] = [];
    public contentLabelControl = new FormControl("");

    public titleControl = new FormControl("");

    public loading: boolean;
    public unitControl = new FormControl("");
    public description: string;

    public hasChangedContentLabels = false;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: PropertyDialogData,
        public createVersionGQL: CreateVersionGQL,
        private dialogRef: MatDialogRef<EditPropertyDialogComponent>,
        private packageService: PackageService
    ) {
        if (data) {
            const propertiesObject = cloneDeep(data.schema.properties);
            this.properties = Object.values(propertiesObject);
            this.package = data.package;
            this.packageFile = cloneDeep(data.packageFile);
            this.schema = data.schema;

            this.selectedProperty = this.properties.find((p) => p.title === data.property.title);
            this.updateSelectedProperty();
        }
    }

    public updateSelectedProperty(): void {
        if (this.selectedProperty) {
            this.selectedPropertyTitle = this.selectedProperty.title;
            this.titleControl.setValue(this.selectedPropertyTitle);
            this.unitControl.setValue(this.selectedProperty.unit);
            this.description = this.selectedProperty.description;
            this.addLabelsChips();
        }
    }

    public save(): void {
        this.loading = true;
        if (
            !this.titleControl.value ||
            (this.selectedProperty.title === this.titleControl.value &&
                this.selectedProperty.unit === this.unitControl.value &&
                this.selectedProperty.description === this.description &&
                !this.hasChangedContentLabels)
        ) {
            return;
        }

        this.selectedProperty.title = this.titleControl.value;
        this.selectedProperty.unit = this.unitControl.value;
        this.selectedProperty.description = this.description;
        const updatedPackageFile = cloneDeep(this.packageFile);
        const schemaToChange = updatedPackageFile.schemas.find((s) => s.title === this.schema.title);
        const propertyToUpdateIndx = Object.values(schemaToChange.properties).findIndex(
            (p) => p.title === this.selectedPropertyTitle
        );
        const propertyKey = Object.keys(schemaToChange.properties)[propertyToUpdateIndx];
        schemaToChange.properties[propertyKey] = this.selectedProperty;

        const currentVersion = new SemVer(updatedPackageFile.version);

        const diffs = comparePackages(this.packageFile, updatedPackageFile);
        const compatibilty = diffCompatibility(diffs);

        const newVersion = nextVersion(currentVersion, compatibilty);
        updatedPackageFile.version = newVersion.version;

        this.createVersionGQL
            .mutate({
                identifier: {
                    catalogSlug: this.package.identifier.catalogSlug,
                    packageSlug: this.package.identifier.packageSlug
                },
                value: {
                    packageFile: JSON.stringify(updatedPackageFile)
                }
            })
            .subscribe(() => {
                this.loading = false;
                this.packageService.getPackage(
                    this.package.identifier.catalogSlug,
                    this.package.identifier.packageSlug
                );
                this.dialogRef.close();
            });
    }

    public addLabelsChips() {
        this.valueTypeValues = Object.values(this.selectedProperty.types);
        this.valueTypeValues.forEach((v) => {
            if (!v.contentLabels) {
                v.contentLabels = [];
            }
        });
    }

    public addOnBlur(values: ContentLabel[]): void {
        if (this.contentLabelControl.value && this.contentLabelControl.value.length) {
            this.addLabelChip(this.contentLabelControl.value, values);
        }
    }

    public getContentLabels(valueType) {
        if (valueType.contentLabels) {
            return valueType.contentLabels;
        } else {
            valueType.contentLabels = [];
            return valueType.contentLabels;
        }
    }

    public addFromInputControlValue(values: ContentLabel[]): void {
        const value = this.contentLabelControl.value;
        if (value && value.trim().length && this.isLabelChipAdded(value, values)) {
            this.addLabelChip(value, values);
            this.contentLabelControl.setValue(null);
        }
    }

    public selectFromAutocompleteDropdown(event: MatAutocompleteSelectedEvent, values: ContentLabel[]): void {
        const optionValue: string = event.option.value;
        this.addLabelChip(optionValue, values);
        this.contentLabelControl.setValue(null);
    }

    public add(event: MatChipInputEvent, values: ContentLabel[]): void {
        const value = event.value;
        this.addLabelChip(value, values);
    }

    public removeFromSelection(label: ContentLabel, values: ContentLabel[]): void {
        const index = values.indexOf(label);

        if (index >= 0) {
            if (label.appliedByContentDetector) {
                label.hidden = true;
            } else {
                values.splice(index, 1);
            }
            this.hasChangedContentLabels = true;
        }
    }

    private addLabelChip(value: string, values: ContentLabel[]): void {
        values.push({
            label: value,
            hidden: false
        });

        this.contentLabelControl.setValue(null);
        this.hasChangedContentLabels = true;
    }

    private isLabelChipAdded(value: string, values: ContentLabel[]): boolean {
        return values.find((chip) => chip.label === value) != null;
    }
}
