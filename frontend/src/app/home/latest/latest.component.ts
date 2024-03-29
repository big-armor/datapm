import { ChangeDetectorRef, Component, OnInit } from "@angular/core";
import { Collection, GetLatestCollectionsGQL, GetLatestPackagesGQL, Package } from "src/generated/graphql";
import { LimitAndOffset } from "src/app/shared/package-and-collection/limit-and-offset";
import { Observable, Subscriber } from "rxjs";
import { map } from "rxjs/operators";
import { PackagesResponse } from "src/app/shared/package-and-collection/packages-response";
import { CollectionsResponse } from "src/app/shared/package-and-collection/collections-response";
import { CatalogsResponse } from "src/app/shared/package-and-collection/catalogs-response";
@Component({
    selector: "latest",
    templateUrl: "./latest.component.html"
})
export class LatestComponent implements OnInit {
    public packagesQuery: Observable<PackagesResponse>;
    public collectionsQuery: Observable<CollectionsResponse>;
    public catalogsQuery: Observable<CatalogsResponse>
    public catalogsSubscriber: Subscriber<CatalogsResponse>;

    constructor(
        private latestCollections: GetLatestCollectionsGQL,
        private latestPackages: GetLatestPackagesGQL,
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
        this.packagesQuery = this.latestPackages.fetch(limitAndOffset).pipe(
            map(
                (response) => {
                    if (response.errors) {
                        return {
                            errors: response.errors.map((e) => e.message)
                        };
                    }

                    return {
                        packages: response.data.latestPackages.packages as Package[],
                        hasMore: response.data.latestPackages.hasMore
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

    public updateCollectionFetchingQuery(limitAndOffset: LimitAndOffset): void {
        this.collectionsQuery = this.latestCollections.fetch(limitAndOffset).pipe(
            map(
                (response) => {
                    if (response.errors) {
                        return {
                            errors: response.errors.map((e) => e.message)
                        };
                    }

                    return {
                        collections: response.data.latestCollections.collections as Collection[],
                        hasMore: response.data.latestCollections.hasMore
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
