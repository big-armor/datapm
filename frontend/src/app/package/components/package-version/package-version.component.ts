import { Component } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import {
    Package,
    PackageDifference,
    PackageDifferences,
    PackageDifferenceType,
    PackageIdentifierInput,
    PackageVersionsDiffsGQL,
    Version,
    VersionIdentifier,
    VersionIdentifierInput,
    VersionIdentifierValues
} from "src/generated/graphql";
import { PackageService, PackageResponse } from "../../services/package.service";
import { VersionComparisonModalComponent } from "./version-comparison-modal/version-comparison-modal.component";
import { VersionComparisonModel } from "./version-comparison-modal/version-comparison-model";

interface Change {
    changeLabel?: string;
    changeFieldName?: string;
}

interface VersionWithDifferences extends Version {
    changes?: Change[];
}

@Component({
    selector: "version",
    templateUrl: "./package-version.component.html",
    styleUrls: ["./package-version.component.scss"]
})
export class PackageVersionComponent {
    private readonly unsubscribe$ = new Subject();

    public package: Package;
    public versions: VersionWithDifferences[] = [];

    public differencesByNewVersionIdentifier = new Map<string, PackageDifferences>();
    private packageIdentifier: PackageIdentifierInput;

    constructor(
        private packageService: PackageService,
        private packageVersionDiffsGQL: PackageVersionsDiffsGQL,
        private dialog: MatDialog
    ) {
        this.packageService.package.pipe(takeUntil(this.unsubscribe$)).subscribe((p: PackageResponse) => {
            if (p == null || p.package == null) {
                return;
            }

            this.package = p.package;
            this.packageIdentifier = {
                catalogSlug: this.package.identifier.catalogSlug,
                packageSlug: this.package.identifier.packageSlug
            };

            this.versions = this.package.versions.sort((a, b) => {
                const aDate = a.createdAt.getTime();
                const bDate = b.createdAt.getTime();
                if (aDate > bDate) return -1;
                if (bDate < aDate) return 1;
                return 0;
            });

            this.loadDifferences();
        });
    }

    public ngOnDestroy(): void {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }

    public openVersionComparisonModal(): void {
        if (this.versions.length > 1) {
            this.openVersionComparisonModalForVersion(this.versions[0].identifier);
        }
    }

    public openVersionComparisonModalForVersion(version: VersionIdentifier): void {
        const comparingVersion = this.resolveVersionToCompareTo(version);
        if (!comparingVersion) {
            return;
        }

        this.dialog.open(VersionComparisonModalComponent, {
            data: {
                packageIdentifier: this.packageIdentifier,
                newVersion: version,
                oldVersion: comparingVersion.identifier,
                versions: this.versions
            } as VersionComparisonModel,
            width: "500px"
        });
    }

    private resolveVersionToCompareTo(version: VersionIdentifier): Version {
        const index = this.versions.findIndex((v) => v.identifier === version);
        if (index === this.versions.length - 1) {
            return null;
        }

        return this.versions[index + 1];
    }

    private loadDifferences(): void {
        this.packageVersionDiffsGQL
            .fetch({
                limit: 10,
                offset: 0,
                packageIdentifier: this.packageIdentifier
            })
            .subscribe((response) => {
                if (response.errors) {
                    return;
                }

                response.data.packageVersionsDiffs.forEach((v) =>
                    this.differencesByNewVersionIdentifier.set(this.serializeVersion(v.newVersion), v)
                );
                this.versions.forEach((v) => {
                    const identifier = this.serializeVersion(v.identifier);
                    const differencesSet = this.differencesByNewVersionIdentifier.get(identifier);
                    if (!differencesSet || !differencesSet.differences || !differencesSet.differences.length) {
                        v.changes = [{ changeLabel: "Initial version" }];
                        return;
                    }

                    v.changes = differencesSet.differences.map((d) => this.getLabelFromChangeType(d));
                });
            });
    }

    private serializeVersion(versionIdentifier: VersionIdentifier | VersionIdentifierValues): string {
        return (
            versionIdentifier.versionMajor + "." + versionIdentifier.versionMinor + "." + versionIdentifier.versionPatch
        );
    }

    private getLabelFromChangeType(difference: PackageDifference): Change {
        let changeLabel: string;
        switch (difference.type) {
            case PackageDifferenceType.REMOVE_SCHEMA:
                changeLabel = "Removed schema";
                break;
            case PackageDifferenceType.REMOVE_HIDDEN_SCHEMA:
                changeLabel = "Removed hidden schema";
                break;
            case PackageDifferenceType.ADD_SCHEMA:
                changeLabel = "Added schema";
                break;
            case PackageDifferenceType.REMOVE_SOURCE:
                changeLabel = "Removed source";
                break;
            case PackageDifferenceType.CHANGE_PACKAGE_DISPLAY_NAME:
                changeLabel = "Changed package display name";
                break;
            case PackageDifferenceType.CHANGE_PACKAGE_DESCRIPTION:
                changeLabel = "Changed package description";
                break;
            case PackageDifferenceType.CHANGE_SOURCE:
                changeLabel = "Changed source";
                break;
            case PackageDifferenceType.CHANGE_SOURCE_URIS:
                changeLabel = "Changed source URIs";
                break;
            case PackageDifferenceType.CHANGE_STREAM_STATS:
                changeLabel = "Changed stream stats";
                break;
            case PackageDifferenceType.CHANGE_STREAM_UPDATE_HASH:
                changeLabel = "Updated stream hash";
                break;
            case PackageDifferenceType.ADD_PROPERTY:
                changeLabel = "Added property";
                break;
            case PackageDifferenceType.HIDE_PROPERTY:
                changeLabel = "Hid property";
                break;
            case PackageDifferenceType.UNHIDE_PROPERTY:
                changeLabel = "Unhid property";
                break;
            case PackageDifferenceType.REMOVE_PROPERTY:
                changeLabel = "Removed property";
                break;
            case PackageDifferenceType.REMOVE_HIDDEN_PROPERTY:
                changeLabel = "Removed hidden property";
                break;
            case PackageDifferenceType.CHANGE_PROPERTY_TYPE:
                changeLabel = "Changed property type";
                break;
            case PackageDifferenceType.CHANGE_PROPERTY_FORMAT:
                changeLabel = "Changed property format";
                break;
            case PackageDifferenceType.CHANGE_PROPERTY_DESCRIPTION:
                changeLabel = "Changed property description";
                break;
            case PackageDifferenceType.CHANGE_GENERATED_BY:
                changeLabel = "Changed author";
                break;
            case PackageDifferenceType.CHANGE_UPDATED_DATE:
                changeLabel = "Changed updated date";
                break;
            case PackageDifferenceType.CHANGE_VERSION:
                changeLabel = "Changed version";
                break;
            case PackageDifferenceType.CHANGE_README_MARKDOWN:
                changeLabel = "Changed README markdown";
                break;
            case PackageDifferenceType.CHANGE_LICENSE_MARKDOWN:
                changeLabel = "Changed license markdown";
                break;
            case PackageDifferenceType.CHANGE_README_FILE:
                changeLabel = "Changed README file";
                break;
            case PackageDifferenceType.CHANGE_LICENSE_FILE:
                changeLabel = "Changed LICENSE file";
                break;
            case PackageDifferenceType.CHANGE_WEBSITE:
                changeLabel = "Changed website";
                break;
            case PackageDifferenceType.CHANGE_CONTACT_EMAIL:
                changeLabel = "Changed contact email";
                break;
            case PackageDifferenceType.REMOVE_STREAM_SET:
                changeLabel = "Removed stream set";
                break;
        }

        return {
            changeLabel,
            changeFieldName: difference.pointer
        };
    }
}
