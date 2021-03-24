import { Component, Inject, OnInit } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { PackageIdentifierInput, PackageVersionsDiffGQL, Version, VersionIdentifier } from "src/generated/graphql";
import { Change, getReadableChangeFromDifference } from "../version-change-label-util";
import { VersionComparisonModel } from "./version-comparison-model";

@Component({
    selector: "app-version-comparison-modal",
    templateUrl: "./version-comparison-modal.component.html",
    styleUrls: ["./version-comparison-modal.component.scss"]
})
export class VersionComparisonModalComponent implements OnInit {
    public packageIdentifier: PackageIdentifierInput;
    public newVersion: VersionIdentifier;
    public oldVersion: VersionIdentifier;
    public versions: Version[] = [];

    public changes: Change[] = [];

    public loading: boolean = false;
    public errorMessage: string;

    constructor(
        @Inject(MAT_DIALOG_DATA) public model: VersionComparisonModel,
        public dialogRef: MatDialogRef<VersionComparisonModalComponent>,
        private packageVersionsDiffGQL: PackageVersionsDiffGQL
    ) {
        this.packageIdentifier = model.packageIdentifier;
        this.newVersion = model.newVersion;
        this.oldVersion = model.oldVersion;
        this.versions = model.versions;
    }

    public ngOnInit(): void {
        this.compareVersions();
    }

    public compareVersions(): void {
        if (this.newVersion === this.oldVersion) {
            this.changes = [];
            return;
        }

        this.loading = true;
        this.packageVersionsDiffGQL
            .fetch({
                newVersion: {
                    ...this.packageIdentifier,
                    versionMajor: this.newVersion.versionMajor,
                    versionMinor: this.newVersion.versionMinor,
                    versionPatch: this.newVersion.versionPatch
                },
                oldVersion: {
                    ...this.packageIdentifier,
                    versionMajor: this.oldVersion.versionMajor,
                    versionMinor: this.oldVersion.versionMinor,
                    versionPatch: this.oldVersion.versionPatch
                }
            })
            .subscribe(
                (differencesResponse) => {
                    if (differencesResponse.errors && differencesResponse.errors.length) {
                        this.errorMessage = differencesResponse.errors[0].message;
                    } else if (differencesResponse.data) {
                        this.changes = differencesResponse.data.packageVersionsDiff.differences
                            .map((d) => getReadableChangeFromDifference(d))
                            .filter((c) => c != null);
                    }
                    this.loading = false;
                },
                () => {
                    this.loading = false;
                    this.errorMessage = "Internal server error.";
                }
            );
    }

    public close(): void {
        this.dialogRef.close();
    }
}
