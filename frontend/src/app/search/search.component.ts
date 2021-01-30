import { Component, OnInit, OnDestroy, ChangeDetectorRef } from "@angular/core";
import { ActivatedRoute, ParamMap } from "@angular/router";
import { Subject, Observable } from "rxjs";
import { map, takeUntil } from "rxjs/operators";

import { SearchPackagesGQL, SearchCollectionsGQL, Package, Collection } from "src/generated/graphql";
import { CollectionsResponse } from "../shared/package-and-collection/collections-response";
import { PackagesResponse } from "../shared/package-and-collection/packages-response";
import { SearchParameters } from "../shared/package-and-collection/search-parameters";

@Component({
    selector: "search",
    templateUrl: "./search.component.html",
    styleUrls: ["./search.component.scss"]
})
export class SearchComponent implements OnInit, OnDestroy {
    public query: any;

    public collectionsParameters: SearchParameters;
    public packagesParameters: SearchParameters;

    public collectionsQuery: Observable<CollectionsResponse>;
    public packagesQuery: Observable<PackagesResponse>;

    private readonly subscription = new Subject();

    constructor(
        private route: ActivatedRoute,
        private searchPackagesGQL: SearchPackagesGQL,
        private searchCollectionsGQL: SearchCollectionsGQL,
        private cdr: ChangeDetectorRef
    ) {}

    public ngOnInit(): void {
        this.route.queryParamMap.pipe(takeUntil(this.subscription)).subscribe((params: ParamMap) => {
            const newQuery = params.get("q") || "";
            console.log(this.query, newQuery);
            if (newQuery == this.query) {
                return;
            }

            this.query = newQuery;
            if (this.packagesParameters && this.collectionsParameters) {
                this.packagesParameters = { query: this.query, offset: 0, limit: this.packagesParameters.limit };
                this.collectionsParameters = { query: this.query, offset: 0, limit: this.collectionsParameters.limit };

                this.updatePackageFetchingQueryValue(this.packagesParameters, true);
                this.updateCollectionsFetchingQueryValue(this.collectionsParameters, true);
            }
        });
        this.cdr.detectChanges();
    }

    public ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    public updatePackageFetchingQuery(searchQuery: SearchParameters): void {
        this.updatePackageFetchingQueryValue(searchQuery, false);
    }

    public updatePackageFetchingQueryValue(searchQuery: SearchParameters, resetCollection: boolean): void {
        this.packagesParameters = this.updateParametersQuery(searchQuery);
        this.packagesQuery = this.searchPackagesGQL.fetch(this.packagesParameters).pipe(
            map(
                (response) => {
                    if (response.errors) {
                        return {
                            errors: response.errors.map((e) => e.message)
                        };
                    }

                    return {
                        packages: response.data.searchPackages.packages as Package[],
                        hasMore: response.data.searchPackages.hasMore,
                        shouldResetCollection: resetCollection
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

    public updateCollectionsFetchingQuery(searchQuery: SearchParameters): void {
        this.updateCollectionsFetchingQueryValue(searchQuery, false);
    }

    public updateCollectionsFetchingQueryValue(searchQuery: SearchParameters, resetCollection: boolean): void {
        this.collectionsParameters = this.updateParametersQuery(searchQuery);
        this.collectionsQuery = this.searchCollectionsGQL.fetch(this.collectionsParameters).pipe(
            map(
                (response) => {
                    if (response.errors) {
                        return {
                            errors: response.errors.map((e) => e.message)
                        };
                    }

                    return {
                        collections: response.data.searchCollections.collections as Collection[],
                        hasMore: response.data.searchCollections.hasMore,
                        shouldResetCollection: resetCollection
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

    private updateParametersQuery(searchQuery: SearchParameters): SearchParameters {
        if (!searchQuery.query) {
            searchQuery.query = this.query;
        }

        return searchQuery;
    }
}
