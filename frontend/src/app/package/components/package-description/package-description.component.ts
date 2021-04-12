import { Component } from "@angular/core";
import { Router } from "@angular/router";
import { PackageFile, parsePackageFileJSON, Schema, validatePackageFileInBrowser } from "datapm-lib";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { CollectionBasicData, Package, PackageCollectionsGQL } from "src/generated/graphql";
import { PackageService, PackageResponse } from "../../services/package.service";
@Component({
    selector: "package-description",
    templateUrl: "./package-description.component.html",
    styleUrls: ["./package-description.component.scss"]
})
export class PackageDescriptionComponent {
    private readonly SHOW_MORE_CHARACTER_LIMIT = 300;
    private readonly unsubscribe$ = new Subject();

    public package: Package;
    public packageFile: PackageFile;

    public schemas: any[] = [];
    public selectedSchema: Schema;

    public shouldShowMoreLicenseButton: boolean;
    public isShowingMoreLicenseText: boolean;

    public shouldShowMoreReadMeButton: boolean;
    public isShowingMoreReadMeText: boolean;

    public collections: CollectionBasicData[] = [];

    constructor(
        private packageService: PackageService,
        private packageCollectionsGQL: PackageCollectionsGQL,
        private router: Router
    ) {
        this.packageService.package.pipe(takeUntil(this.unsubscribe$)).subscribe((p: PackageResponse) => {
            if (p == null || p.package == null) {
                return;
            }

            this.package = p.package;

            const packageIdentifier = {
                catalogSlug: this.package.identifier.catalogSlug,
                packageSlug: this.package.identifier.packageSlug
            };

            this.packageCollectionsGQL
                .fetch({ packageIdentifier, limit: 10, offset: 0 })
                .subscribe((response) => (this.collections = response.data.packageCollections.collections));

            validatePackageFileInBrowser(p.package.latestVersion.packageFile);
            this.packageFile = parsePackageFileJSON(p.package.latestVersion.packageFile);
            this.schemas = this.packageFile.schemas;

            this.shouldShowMoreReadMeButton = this.packageFile.readmeMarkdown?.length > this.SHOW_MORE_CHARACTER_LIMIT;
            this.shouldShowMoreLicenseButton =
                this.packageFile.licenseMarkdown?.length > this.SHOW_MORE_CHARACTER_LIMIT;

            if (this.schemas.length) {
                this.selectedSchema = this.schemas[0];
            }
        });
    }

    public goToCollection(collectionSlug: string): void {
        this.router.navigate(["collection/" + collectionSlug]);
    }

    public toggleShowMoreReadMeText() {
        this.isShowingMoreReadMeText = !this.isShowingMoreReadMeText;
    }

    public toggleShowMoreLicenseText() {
        this.isShowingMoreLicenseText = !this.isShowingMoreLicenseText;
    }

    public selectSchema(schema: Schema): void {
        this.selectedSchema = schema;
    }

    public ngOnDestroy(): void {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }
}
