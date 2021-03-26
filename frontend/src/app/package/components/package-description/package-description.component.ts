import { Component } from "@angular/core";
import { PackageFile, parsePackageFileJSON, validatePackageFileInBrowser } from "datapm-lib";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { Package } from "src/generated/graphql";
import { PackageService, PackageResponse } from "../../services/package.service";
@Component({
    selector: "package-description",
    templateUrl: "./package-description.component.html",
    styleUrls: ["./package-description.component.scss"]
})
export class PackageDescriptionComponent {
    private readonly SHOW_MORE_CHARACTER_LIMIT = 100;

    public package: Package;
    public packageFile: PackageFile;
    private unsubscribe$ = new Subject();

    public shouldShowMoreDescriptionButton: boolean;
    public isShowingMoreDescriptionText: boolean;

    public shouldShowMoreLicenseButton: boolean;
    public isShowingMoreLicenseText: boolean;

    public shouldShowMoreReadMeButton: boolean;
    public isShowingMoreReadMeText: boolean;

    constructor(private packageService: PackageService) {
        this.packageService.package.pipe(takeUntil(this.unsubscribe$)).subscribe((p: PackageResponse) => {
            if (p == null || p.package == null) return;

            this.package = p.package;
            this.shouldShowMoreDescriptionButton = this.package.description?.length > this.SHOW_MORE_CHARACTER_LIMIT;

            // TEMP: DELETE THIS
            this.packageFile = new PackageFile();
            this.packageFile.readmeMarkdown = this.package.description;
            this.packageFile.licenseMarkdown = this.package.description;

            this.shouldShowMoreReadMeButton = this.package.description?.length > this.SHOW_MORE_CHARACTER_LIMIT;
            this.shouldShowMoreLicenseButton = this.package.description?.length > this.SHOW_MORE_CHARACTER_LIMIT;

            // validatePackageFileInBrowser(p.package.latestVersion.packageFile);
            // this.packageFile = parsePackageFileJSON(p.package.latestVersion.packageFile);
        });
    }

    public toggleShowMoreDescriptionText() {
        this.isShowingMoreDescriptionText = !this.isShowingMoreDescriptionText;
    }

    public toggleShowMoreReadMeText() {
        this.isShowingMoreReadMeText = !this.isShowingMoreReadMeText;
    }

    public toggleShowMoreLicenseText() {
        this.isShowingMoreLicenseText = !this.isShowingMoreLicenseText;
    }

    ngOnDestroy(): void {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }
}
