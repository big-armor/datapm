import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject, throwError } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

import {
  SearchPackagesGQL,
  Package,
  SearchPackagesQuery, 
  PackageIdentifier
} from 'src/generated/graphql';

enum State {
  LOADING,
  SUCCESS,
  ERROR,
}

enum Filter {
  COLLECTIONS,
  PACKAGES,
  USERS,
}

@Component({
  selector: 'search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss'],
})
export class SearchComponent implements OnInit, OnDestroy {
  State = State;
  public Filter = Filter;

  public state = State.LOADING;

  urlParams: any;
  public isStarClicked: boolean = false;

  public packageResult: SearchPackagesQuery;

  public selectedFilter: Filter = Filter.PACKAGES;

  private subscription = new Subject();

  constructor(
    private route: ActivatedRoute,
    private searchPackagesGQL: SearchPackagesGQL
  ) {}

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntil(this.subscription))
      .subscribe((params) => {
        this.urlParams = params;

        this.state = State.LOADING;
        this.searchPackagesGQL
          .fetch({
            query: this.urlParams.params.q,
            limit: 10,
            offset: 0,
          })
          .pipe(takeUntil(this.subscription))
          .subscribe(
            ({ data }) => {
              this.state = State.SUCCESS;
              this.packageResult = data;
            },
            (_error) => (this.state = State.ERROR)
          );
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

  public getPackageCreator(identifier: PackageIdentifier) {
    const pkg = this.packageResult.searchPackages.packages.find((pkg: Package) => pkg.identifier.packageSlug === identifier.packageSlug && pkg.identifier.catalogSlug === identifier.catalogSlug) as Package;

    const { creator: { firstName, lastName }} = pkg;

    return `${firstName ? firstName : ''} ${lastName ? lastName : ''}`.trim();
  }

  public clickStar(): void {
    this.isStarClicked = !this.isStarClicked;
  }
}
