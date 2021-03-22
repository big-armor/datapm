import { Component } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { Package, PackageDifference, PackageVersionsDiffGQL, Version, VersionIdentifier } from "src/generated/graphql";
import { PackageService, PackageResponse } from "../../services/package.service";
import { VersionComparisonModalComponent } from "./version-comparison-modal/version-comparison-modal.component";
import { VersionComparisonModel } from "./version-comparison-modal/version-comparison-model";

@Component({
    selector: "version",
    templateUrl: "./package-version.component.html",
    styleUrls: ["./package-version.component.scss"]
})
export class PackageVersionComponent {
    private readonly unsubscribe$ = new Subject();

    public package: Package;
    public versions: Version[];
    public differences: PackageDifference[];

    constructor(private packageService: PackageService, private dialog: MatDialog) {
        this.packageService.package.pipe(takeUntil(this.unsubscribe$)).subscribe((p: PackageResponse) => {
            if (p == null || p.package == null) return;
            this.package = p.package;
            this.versions = p.package.versions.sort((a, b) => {
                const aDate = a.createdAt.getTime();
                const bDate = b.createdAt.getTime();
                if (aDate > bDate) return -1;
                if (bDate < aDate) return 1;
                return 0;
            });
        });
    }

    public ngOnDestroy(): void {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }

    public openVersionComparisonModal(version: VersionIdentifier): void {
        const comparingVersion = this.resolveVersionToCompareTo(version);
        if (!comparingVersion) {
            return;
        }

        const packageIdentifier = {
            catalogSlug: this.package.identifier.catalogSlug,
            packageSlug: this.package.identifier.packageSlug
        };
        this.dialog.open(VersionComparisonModalComponent, {
            data: {
                packageIdentifier: packageIdentifier,
                newVersion: version,
                oldVersion: comparingVersion.identifier,
                versions: this.versions
            } as VersionComparisonModel
        });
    }

    private resolveVersionToCompareTo(version: VersionIdentifier): Version {
        const index = this.versions.findIndex((v) => v.identifier === version);
        if (index === this.versions.length - 1) {
            return null;
        }

        return this.versions[index + 1];
    }
}
