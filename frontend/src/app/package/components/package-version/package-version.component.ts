import { Component } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import {
    Package,
    PackageDifferences,
    PackageIdentifierInput,
    PackageVersionsDiffsGQL,
    Version,
    VersionIdentifier,
    VersionIdentifierValues
} from "src/generated/graphql";
import { PackageService, PackageResponse } from "../../services/package.service";
import { VersionComparisonModalComponent } from "./version-comparison-modal/version-comparison-modal.component";
import { VersionComparisonModel } from "./version-comparison-modal/version-comparison-model";
import { Change, getReadableChangeFromDifference } from "./version-change-label-util";

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
    private readonly VERSIONS_PER_PAGE = 20;

    public package: Package;
    public displayedVersions: VersionWithDifferences[] = [];

    private versions: VersionWithDifferences[] = [];
    private differencesByNewVersionIdentifier = new Map<string, PackageDifferences>();

    public hasMoreDifferences: boolean;
    private loadedVersionsDifferencesCount: number = 0;
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

    public displayMoreDifferences(): void {
        if (this.hasMoreDifferences) {
            this.loadDifferences();
        }
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
                limit: this.VERSIONS_PER_PAGE,
                offset: this.loadedVersionsDifferencesCount,
                packageIdentifier: this.packageIdentifier
            })
            .subscribe((response) => {
                if (response.errors) {
                    return;
                }

                const diffs = response.data.packageVersionsDiffs;

                const previouslyLoadedVersionsDifferencesCount = this.loadedVersionsDifferencesCount;
                this.loadedVersionsDifferencesCount += diffs.length;
                this.hasMoreDifferences = this.loadedVersionsDifferencesCount < this.versions.length - 1;
                const numberOfNewVersionsToDisplay = this.hasMoreDifferences ? diffs.length : diffs.length + 1;

                const newVersionsToDisplay = this.versions.slice(
                    previouslyLoadedVersionsDifferencesCount,
                    previouslyLoadedVersionsDifferencesCount + numberOfNewVersionsToDisplay
                );

                this.displayedVersions.push(...newVersionsToDisplay);

                diffs.forEach((v) =>
                    this.differencesByNewVersionIdentifier.set(this.serializeVersion(v.newVersion), v)
                );

                this.displayedVersions.forEach((v) => {
                    const identifier = this.serializeVersion(v.identifier);
                    const differencesSet = this.differencesByNewVersionIdentifier.get(identifier);
                    if (!differencesSet || !differencesSet.differences || !differencesSet.differences.length) {
                        const changeLabel = this.hasMoreDifferences ? "No changes" : "Initial Version";
                        v.changes = [{ changeLabel }];
                    } else {
                        v.changes = differencesSet.differences.map((d) => getReadableChangeFromDifference(d));
                    }
                });
            });
    }

    private serializeVersion(versionIdentifier: VersionIdentifier | VersionIdentifierValues): string {
        return (
            versionIdentifier.versionMajor + "." + versionIdentifier.versionMinor + "." + versionIdentifier.versionPatch
        );
    }
}
