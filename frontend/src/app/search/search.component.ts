import { Component, OnInit, OnDestroy } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";

import {
	SearchPackagesGQL,
	SearchCollectionsGQL,
	SearchPackagesQuery,
	SearchCollectionsQuery
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
	public urlParams: any;
	public limit: number = 10;
	public offset: number = 0;

	public packageResult: SearchPackagesQuery;
	public collectionResult: SearchCollectionsQuery;

	private State = State;
	private subscription = new Subject();

	constructor(
		private route: ActivatedRoute,
		private searchPackagesGQL: SearchPackagesGQL,
		private searchCollectionsGQL: SearchCollectionsGQL
	) {}

	ngOnInit(): void {
		this.route.paramMap.pipe(takeUntil(this.subscription)).subscribe((params) => {
			this.urlParams = params;

			if (this.selectedFilter === Filter.PACKAGES) this.onPackageFilterChange();
			if (this.selectedFilter == Filter.COLLECTIONS) this.onCollectionFilterChange();
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
				query: this.urlParams.params.q,
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
				query: this.urlParams.params.q,
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
