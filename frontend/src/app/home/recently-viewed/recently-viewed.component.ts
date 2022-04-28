import { ChangeDetectorRef, Component, OnInit } from "@angular/core";
import {
    Collection,
    MyRecentlyViewedCollectionsGQL,
    MyRecentlyViewedPackagesGQL,
    Package
} from "src/generated/graphql";
import { PackagesResponse } from "src/app/shared/package-and-collection/packages-response";
import { LimitAndOffset } from "src/app/shared/package-and-collection/limit-and-offset";
import { map } from "rxjs/operators";
import { Observable } from "rxjs";
import { CollectionsResponse } from "src/app/shared/package-and-collection/collections-response";
import { CatalogsResponse } from "src/app/shared/package-and-collection/catalogs-response";
@Component({
    selector: "recently-viewed",
    templateUrl: "./recently-viewed.component.html",
    styleUrls: ["./recently-viewed.component.scss"]
})
export class RecentlyViewedComponent implements OnInit {
    public collectionsQuery: Observable<CollectionsResponse>;
    public packagesQuery: Observable<PackagesResponse>;
    public catalogsQuery: Observable<CatalogsResponse>;

    constructor(
        private recentlyViewedCollectionsQuery: MyRecentlyViewedCollectionsGQL,
        private recentlyViewedPackagesQuery: MyRecentlyViewedPackagesGQL,
        private cdr: ChangeDetectorRef
    ) {}

    public ngOnInit(): void {
        this.cdr.detectChanges();
    }

    public updateCatalogsFetchingQuery(limitAndOffset: LimitAndOffset): void {
        this.catalogsQuery = new Observable((s)=> {
            setTimeout(() => {
                s.next({
                    catalogs: [],
                    hasMore: false,
                    shouldResetCatalogs: true
                });
                s.complete();
            },1);
        });
    }

    public updatePackageFetchingQuery(limitAndOffset: LimitAndOffset): void {
        this.packagesQuery = this.recentlyViewedPackagesQuery.fetch(limitAndOffset).pipe(
            map(
                (response) => {
                    if (response.errors) {
                        return {
                            errors: response.errors.map((e) => e.message)
                        };
                    }

                    return {
                        packages: response.data.myRecentlyViewedPackages.logs.map((l) => l.targetPackage) as Package[],
                        hasMore: response.data.myRecentlyViewedPackages.hasMore
                    };
                },
                (error) => {
                    return {
                        errors: [error]
                    };
                }
            )
        );
    }

    public updateCollectionsFetchingQuery(limitAndOffset: LimitAndOffset): void {
        this.collectionsQuery = this.recentlyViewedCollectionsQuery.fetch(limitAndOffset).pipe(
            map(
                (response) => {
                    if (response.errors) {
                        return {
                            errors: response.errors.map((e) => e.message)
                        };
                    }

                    return {
                        collections: response.data.myRecentlyViewedCollections.logs.map(
                            (l) => l.targetCollection
                        ) as Collection[],
                        hasMore: response.data.myRecentlyViewedCollections.hasMore
                    };
                },
                (error) => {
                    return {
                        errors: [error]
                    };
                }
            )
        );
    }
}
