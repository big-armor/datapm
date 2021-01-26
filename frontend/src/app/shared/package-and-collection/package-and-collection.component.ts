import { Component, EventEmitter, Input, Output } from "@angular/core";
import { Collection, Package } from "src/generated/graphql";
import { LimitAndOffset } from "./limit-and-offset";

@Component({
    selector: "app-package-and-collection",
    templateUrl: "./package-and-collection.component.html",
    styleUrls: ["./package-and-collection.component.scss"]
})
export class PackageAndCollectionComponent {
    @Input()
    public collections: Collection[];

    @Input()
    public packages: Package[];

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
    public loadCollections = new EventEmitter<LimitAndOffset>();

    @Output()
    public loadPackages = new EventEmitter<LimitAndOffset>();

    public loadMoreCollections(): void {
        this.loadCollections.emit({
            limit: this.collectionsLimit,
            offset: this.collections.length
        });
    }

    public loadMorePackages(): void {
        this.loadPackages.emit({
            limit: this.packagesLimit,
            offset: this.packages.length
        });
    }
}
