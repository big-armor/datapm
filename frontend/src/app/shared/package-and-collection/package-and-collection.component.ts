import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from "@angular/core";
import { Collection, Package } from "src/generated/graphql";
import { LimitAndOffset } from "./limit-and-offset";
import { PackagesResponse } from "./packages-response";
import { CollectionsResponse } from "./collections-response";
import { Observable } from "rxjs";
import { finalize } from "rxjs/operators";

@Component({
    selector: "app-package-and-collection",
    templateUrl: "./package-and-collection.component.html",
    styleUrls: ["./package-and-collection.component.scss"]
})
export class PackageAndCollectionComponent implements OnInit, OnChanges {
    public collections: Collection[] = [];
    public packages: Package[] = [];

    @Input()
    public packagesQuery: Observable<PackagesResponse>;

    @Input()
    public collectionsQuery: Observable<CollectionsResponse>;

    @Input()
    public title: string;

    @Input()
    public subTitle: string;

    @Input()
    public collectionsLimit: number = 30;

    @Input()
    public packagesLimit: number = 10;

    @Output()
    public onLoadCollectionsClick = new EventEmitter<LimitAndOffset>();

    @Output()
    public onLoadPackagesClick = new EventEmitter<LimitAndOffset>();

    public loadingCollections: boolean = false;
    public loadingPackages: boolean = false;

    public hasMoreCollections: boolean = false;
    public hasMorePackages: boolean = false;

    public hasCollectionsErrors: boolean = false;
    public hasPackageErrors: boolean = false;

    public ngOnInit(): void {
        this.requestMorePackages();
        this.requestMoreCollections();
    }

    public ngOnChanges(changes: SimpleChanges): void {
        if (changes.collectionsQuery && changes.collectionsQuery.currentValue) {
            this.loadMoreCollections();
        }

        if (changes.packagesQuery && changes.packagesQuery.currentValue) {
            this.loadMorePackages();
        }
    }

    private loadMoreCollections(): void {
        this.loadingCollections = true;
        this.collectionsQuery.pipe(finalize(() => (this.loadingCollections = false))).subscribe((response) => {
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
        this.packagesQuery.pipe(finalize(() => (this.loadingPackages = false))).subscribe((response) => {
            if (response.packages) {
                this.packages = response.shouldResetCollection
                    ? response.packages
                    : this.packages.concat(response.packages);
                this.hasMorePackages = response.hasMore;
            }

            this.hasPackageErrors = response.errors != null;
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
}
