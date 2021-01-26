import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from "@angular/core";
import { Collection, Package } from "src/generated/graphql";
import { LimitAndOffset } from "./limit-and-offset";
import { PackagesResponse } from "./packages-response";
import { Observable } from "rxjs";
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
    public title: string;

    @Input()
    public subTitle: string;

    @Input()
    public collectionsLimit: number = 10;

    @Input()
    public packagesLimit: number = 10;

    @Input()
    public loadingCollections: boolean = false;

    @Input()
    public loadingPackages: boolean = false;

    @Input()
    public hasMoreCollections: boolean = false;

    @Input()
    public hasMorePackages: boolean = false;

    @Output()
    public onLoadCollectionsClick = new EventEmitter<LimitAndOffset>();

    @Output()
    public onLoadPackagesClick = new EventEmitter<LimitAndOffset>();

    public ngOnInit(): void {
        this.requestMorePackages();
    }

    public ngOnChanges(changes: SimpleChanges): void {
        console.log("changes mali", changes);
        // debugger
        if (changes.packagesQuery && changes.packagesQuery.currentValue) {
            this.loadMorePackages();
        }
    }

    private loadMorePackages(): void {
        this.packagesQuery.subscribe((response) => {
            this.packages = this.packages.concat(response.packages);
            this.hasMorePackages = response.hasMore;
        });
    }

    public requestMoreCollections(): void {
        this.onLoadCollectionsClick.emit({
            limit: this.collectionsLimit,
            offset: this.collections.length
        });
    }

    public requestMorePackages(): void {
        this.onLoadPackagesClick.emit({
            limit: this.packagesLimit,
            offset: this.packages.length
        });
    }
}
