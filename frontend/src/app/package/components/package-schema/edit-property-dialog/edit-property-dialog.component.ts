import { Component, Inject, Input, OnInit } from "@angular/core";
import { FormControl } from "@angular/forms";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { cloneDeep } from "@apollo/client/utilities";
import { comparePackages, diffCompatibility, nextVersion, PackageFile, Schema } from "datapm-lib";
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
    public selectedProperty: Schema;
    public selectedPropertyTitle: string;
    public properties: Schema[] = [];
    public package: Package;
    public packageFile: PackageFile;
    public schema: Schema;

    public titleControl = new FormControl("");

    public loading: boolean;
    public unitControl = new FormControl("");
    public description: string;

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
        }
    }

    public save(): void {
        this.loading = true;
        if (
            !this.titleControl.value ||
            (this.selectedProperty.title === this.titleControl.value &&
                this.selectedProperty.unit === this.unitControl.value &&
                this.selectedProperty.description === this.description)
        ) {
            return;
        }

        this.selectedProperty.title = this.titleControl.value;
        this.selectedProperty.unit = this.unitControl.value;
        this.selectedProperty.description = this.description;
        const updatedPackageFile = cloneDeep(this.packageFile);
        const schemaToChange = updatedPackageFile.schemas.find((s) => s.$id === this.schema.$id);
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
}
