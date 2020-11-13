import { Component, OnInit, OnDestroy } from "@angular/core";
import { ActivatedRoute, ParamMap } from "@angular/router";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";

import { TimeAgoPipe } from "../shared/pipes/time-ago.pipe";

import {
    SearchPackagesGQL,
    SearchCollectionsGQL,
    SearchPackagesQuery,
    SearchCollectionsQuery,
    Package,
    Collection
} from "src/generated/graphql";

enum State {
    LOADING,
    SUCCESS,
    ERROR
}

enum Filter {
    COLLECTIONS,
    PACKAGES,
    USERS
}

@Component({
    selector: "search",
    templateUrl: "./search.component.html",
    styleUrls: ["./search.component.scss"]
})
export class SearchComponent implements OnInit, OnDestroy {
    public Filter = Filter;
    public isStarClicked: boolean = false;
    public selectedFilter: Filter = Filter.PACKAGES;
    public state = State.LOADING;
    public query: any;
    public limit: number = 10;
    public offset: number = 0;
    public State = State;

    public packageResult: SearchPackagesQuery;
    public collectionResult: SearchCollectionsQuery;

    private subscription = new Subject();

    constructor(
        private route: ActivatedRoute,
        private searchPackagesGQL: SearchPackagesGQL,
        private searchCollectionsGQL: SearchCollectionsGQL,
        private timeAgoPipe: TimeAgoPipe
    ) {}

    ngOnInit(): void {
        this.route.queryParamMap.pipe(takeUntil(this.subscription)).subscribe((params: ParamMap) => {
            this.query = params.get("q") || null;

            this.onPackageFilterChange();
            this.onCollectionFilterChange();
        });
    }

    ngOnDestroy() {
        this.subscription.unsubscribe();
    }

    public get isPackageSelected() {
        return this.selectedFilter == Filter.PACKAGES;
    }

    public get isUserSelected() {
        return this.selectedFilter == Filter.USERS;
    }

    public get isCollectionSelected() {
        return this.selectedFilter == Filter.COLLECTIONS;
    }

    public clickStar(): void {
        this.isStarClicked = !this.isStarClicked;
    }

    public onPackageFilterChange(): void {
        this.state = State.LOADING;
        this.searchPackagesGQL
            .fetch({
                query: this.query,
                limit: this.limit,
                offset: this.offset
            })
            .pipe(takeUntil(this.subscription))
            .subscribe(
                ({ data }) => {
                    this.state = State.SUCCESS;
                    this.packageResult = data;
                },
                (_) => (this.state = State.ERROR)
            );
    }

    public onCollectionFilterChange(): void {
        this.state = State.LOADING;
        this.searchCollectionsGQL
            .fetch({
                query: this.query,
                limit: this.limit,
                offset: this.offset
            })
            .pipe(takeUntil(this.subscription))
            .subscribe(
                ({ data }) => {
                    this.state = State.SUCCESS;
                    this.collectionResult = data;
                },
                (_) => (this.state = State.ERROR)
            );
    }

    public getPackageDateLabel(pkg: Package) {
        let label;

        if (pkg.latestVersion?.createdAt && pkg.latestVersion?.updatedAt) {
            label =
                pkg.latestVersion.createdAt === pkg.latestVersion.updatedAt
                    ? `Created ${this.timeAgoPipe.transform(pkg.latestVersion.createdAt)}`
                    : `Updated ${this.timeAgoPipe.transform(pkg.latestVersion.updatedAt)}`;

            return label;
        }

        return pkg.createdAt === pkg.updatedAt
            ? `Created ${this.timeAgoPipe.transform(pkg.createdAt)}`
            : `Updated ${this.timeAgoPipe.transform(pkg.updatedAt)}`;
    }

    public getCollectionDateLabel(collection: Collection) {
        let label;

        if (collection.packages?.length) {
            collection.packages.forEach((pkg) => (label = this.getPackageDateLabel(pkg)));

            return label;
        }

        return collection.createdAt === collection.updatedAt
            ? `Created ${this.timeAgoPipe.transform(collection.createdAt)}`
            : `Updated ${this.timeAgoPipe.transform(collection.updatedAt)}`;
    }

    public previous(): void {
        this.offset = this.offset - 10;

        if (this.selectedFilter === Filter.PACKAGES) this.onPackageFilterChange();
        if (this.selectedFilter == Filter.COLLECTIONS) this.onCollectionFilterChange();
    }

    public next(): void {
        this.offset = this.offset + 10;

        if (this.selectedFilter === Filter.PACKAGES) this.onPackageFilterChange();
        if (this.selectedFilter == Filter.COLLECTIONS) this.onCollectionFilterChange();
    }
}
