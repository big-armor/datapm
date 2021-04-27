import { Component, Inject, OnInit } from "@angular/core";
import { FormControl, Validators } from "@angular/forms";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { cloneDeep } from "@apollo/client/utilities";
import { Compability, nextVersion, PackageFile } from "datapm-lib";
import { SemVer } from "semver/classes";
import { PackageService } from "src/app/package/services/package.service";
import { CreateVersionGQL, Package } from "src/generated/graphql";
import { EditPropertyDialogComponent } from "../../package-schema/edit-property-dialog/edit-property-dialog.component";

export interface DialogData {
    packageFile: PackageFile;
    package: Package;
}

@Component({
    selector: "app-edit-website-dialog",
    templateUrl: "./edit-website-dialog.component.html",
    styleUrls: ["./edit-website-dialog.component.scss"]
})
export class EditWebsiteDialogComponent implements OnInit {
    public control = new FormControl("", [
        Validators.required,
        Validators.pattern("(https?://)?([da-z.-]+).([a-z.]{2,6})/[^\\s]*/?")
    ]);

    public errorMessage;
    public package: Package;
    public packageFile: PackageFile;

    public loading: boolean;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: DialogData,
        public createVersionGQL: CreateVersionGQL,
        public packageService: PackageService,
        public dialog: MatDialogRef<EditPropertyDialogComponent>
    ) {
        this.package = data.package;
        this.packageFile = data.packageFile;
        this.control.setValue(this.packageFile.website);
    }

    ngOnInit(): void {}

    public submit(): void {
        if (!this.control.valid) {
            this.errorMessage = "Invalid url";
        } else {
            this.errorMessage = null;
            if (this.packageFile.website === this.control.value) {
                return;
            }
            this.loading = true;

            const updatedPackageFile = cloneDeep(this.packageFile);
            updatedPackageFile.website = this.control.value;
            const currentVersion = new SemVer(updatedPackageFile.version);

            const newVersion = nextVersion(currentVersion, Compability.MinorChange);
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
                    this.packageService.getPackage(
                        this.package.identifier.catalogSlug,
                        this.package.identifier.packageSlug
                    );
                    this.loading = false;
                    this.dialog.close();
                });
        }
    }
}
