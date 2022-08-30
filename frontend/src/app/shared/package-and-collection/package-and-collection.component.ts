import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from "@angular/core";
import { Catalog, Collection, Package } from "src/generated/graphql";
import { LimitAndOffset } from "./limit-and-offset";
import { PackagesResponse } from "./packages-response";
import { CollectionsResponse } from "./collections-response";
import { Observable } from "rxjs";
import { finalize } from "rxjs/operators";
import { CatalogsResponse } from "./catalogs-response";
import { I } from "@angular/cdk/keycodes";
import { Router } from "@angular/router";

@Component({
    selector: "app-package-and-collection",
    templateUrl: "./package-and-collection.component.html",
    styleUrls: ["./package-and-collection.component.scss"]
})
export class PackageAndCollectionComponent implements OnInit, OnChanges {
    public collections: Collection[] = [];
    public packages: Package[] = [];
    public catalogs: Catalog[] = [];

    constructor(private router: Router) {}

    @Input()
    public catalogsQuery: Observable<CatalogsResponse>;

    @Input()
    public packagesQuery: Observable<PackagesResponse>;

    @Input()
    public collectionsQuery: Observable<CollectionsResponse>;

    @Input()
    public title: string;

    @Input()
    public subtitlesPrefix: string;

    @Input()
    public collectionsLimit: number = 30;

    @Input()
    public packagesLimit: number = 10;

    @Input()
    public catalogsLimit: number = 10;

    @Output()
    public onLoadCollectionsClick = new EventEmitter<LimitAndOffset>();

    @Output()
    public onLoadPackagesClick = new EventEmitter<LimitAndOffset>();

    @Output()
    public onLoadCatalogsClick = new EventEmitter<LimitAndOffset>();

    public loadingCollections: boolean = false;
    public loadingPackages: boolean = false;
    public loadingCatalogs: boolean = false;

    public hasMoreCollections: boolean = false;
    public hasMorePackages: boolean = false;
    public hasMoreCatalogs: boolean = false;

    public hasCollectionsErrors: boolean = false;
    public hasPackageErrors: boolean = false;
    public hasCatalogErrorrs: boolean = false;

    public loadedCollectionsInitially: boolean = false;
    public loadedPackagesInitially: boolean = false;
    public loadedCatalogsInitially: boolean = false;

    public ngOnInit(): void {
        if (!this.subtitlesPrefix) {
            this.subtitlesPrefix = this.title;
        }

        this.requestMorePackages();
        this.requestMoreCollections();
        this.requestMoreCatalogs();
    }

    public ngOnChanges(changes: SimpleChanges): void {
        if (changes.collectionsQuery && changes.collectionsQuery.currentValue) {
            this.loadMoreCollections();
        }

        if (changes.packagesQuery && changes.packagesQuery.currentValue) {
            this.loadMorePackages();
        }

        if (changes.catalogsQuery && changes.catalogsQuery.currentValue) {
            this.loadMoreCatalogs();
        }
    }

    private loadMoreCollections(): void {
        this.loadingCollections = true;
        this.collectionsQuery
            .pipe(
                finalize(() => {
                    this.loadingCollections = false;
                    this.loadedCollectionsInitially = true;
                })
            )
            .subscribe((response) => {
                if (response.collections) {
                    this.collections = response.shouldResetCollection
                        ? response.collections
                        : this.collections.concat(response.collections);
                    this.hasMoreCollections = response.hasMore;
                }

                this.hasCollectionsErrors = response.errors != null;
            });
    }

    private loadMorePackages(): void {
        this.loadingPackages = true;
        this.packagesQuery
            .pipe(
                finalize(() => {
                    this.loadingPackages = false;
                    this.loadedPackagesInitially = true;
                })
            )
            .subscribe((response) => {
                if (response.packages) {
                    this.packages = response.shouldResetCollection
                        ? response.packages
                        : this.packages.concat(response.packages);
                    this.hasMorePackages = response.hasMore;
                }

                this.hasPackageErrors = response.errors != null;
            });
    }

    private loadMoreCatalogs(): void {
        this.loadingCatalogs = true;
        this.catalogsQuery
            .pipe(
                finalize(() => {
                    this.loadingCatalogs = false;
                    this.loadedCatalogsInitially = true;
                })
            )
            .subscribe((response) => {
                if (response.catalogs) {
                    this.catalogs = response.shouldResetCatalogs
                        ? response.catalogs
                        : this.catalogs.concat(response.catalogs);
                    this.hasMorePackages = response.hasMore;
                }

                this.hasCatalogErrorrs = response.errors != null;
            });
    }

    public requestMoreCollections(): void {
        if (this.loadingCollections) {
            return;
        }

        this.onLoadCollectionsClick.emit({
            limit: this.collectionsLimit,
            offset: this.collections.length
        });
    }

    public requestMorePackages(): void {
        if (this.loadingPackages) {
            return;
        }

        this.onLoadPackagesClick.emit({
            limit: this.packagesLimit,
            offset: this.packages.length
        });
    }

    public requestMoreCatalogs(): void {
        if (this.loadingCatalogs) {
            return;
        }

        this.onLoadCatalogsClick.emit({
            limit: this.catalogsLimit,
            offset: this.catalogs.length
        });
    }

    public catalogClick(catalog: Catalog): void {
        this.router.navigate([catalog.identifier.catalogSlug]);
    }
}
