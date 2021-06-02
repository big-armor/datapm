import { Component, Input } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { PackageFile, parsePackageFileJSON, Schema, validatePackageFileInBrowser } from "datapm-lib";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import {
    User,
    Collection,
    Package,
    PackageCollectionsGQL,
    PackageIdentifierInput,
    MovePackageGQL
} from "src/generated/graphql";
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

    public collections: Collection[] = [];
    public relatedPackages: Package[] = [];

    constructor(
        private packageService: PackageService,
        private packageCollectionsGQL: PackageCollectionsGQL,
        private movePackageGQL: MovePackageGQL,
        private router: Router,
        private route: ActivatedRoute
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

            this.packageCollectionsGQL.fetch({ packageIdentifier, limit: 10, offset: 0 }).subscribe((response) => {
                this.collections = response.data.packageCollections?.collections as Collection[];

                const packageByIdentifier = new Map<string, Package>();
                const thisPackageIdentifier = this.packageIdentifierToString(this.package.identifier);

                if (this.collections) {
                    this.collections.forEach((c) => {
                        c.packages.forEach((p) => {
                            const identifier = this.packageIdentifierToString(p.identifier);
                            if (thisPackageIdentifier != identifier && !packageByIdentifier.has(identifier)) {
                                packageByIdentifier.set(identifier, p);
                            }
                        });
                    });

                    this.relatedPackages = [...packageByIdentifier.values()];
                }
            });

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

        this.move();
    }

    private move() {
        // this.movePackageGQL.mutate({
        //     identifier: {
        //         catalogSlug: "moli",
        //         packageSlug: "adresari"
        //     },
        //     targetCatalog: {
        //         catalogSlug: "malezi"
        //     }
        // }).subscribe();
    }

    public canManage() {
        const isPublic = this.package.myPermissions.filter((permission) => permission === "MANAGE").length > 0;
        return isPublic;
    }

    public editReadme(): void {
        this.router.navigate(["readme"], { relativeTo: this.route });
    }

    public editLicense(): void {
        this.router.navigate(["license"], { relativeTo: this.route });
    }

    public goToCollection(collectionSlug: string): void {
        this.router.navigate(["collection/" + collectionSlug]);
    }

    public goToPackage(packageIdentifier: PackageIdentifierInput): void {
        this.router.navigate([packageIdentifier.catalogSlug, packageIdentifier.packageSlug]);
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

    private packageIdentifierToString(packageIdentifier: PackageIdentifierInput): string {
        return packageIdentifier.catalogSlug + "." + packageIdentifier.packageSlug;
    }
}
