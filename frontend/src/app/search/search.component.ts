import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SearchPackagesGQL, Package, SearchPackagesQuery } from 'src/generated/graphql';


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
  selector: 'search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss']
})
export class SearchComponent implements OnInit {


  State = State;
  public Filter = Filter;

  state = State.LOADING;

  urlParams:any;
  public isStarClicked:boolean = false;

  packageResult:SearchPackagesQuery;

  public selectedFilter: Filter = Filter.COLLECTIONS;

  constructor(
    private route:ActivatedRoute,
    private searchPackagesGQL:SearchPackagesGQL

  ) { }

  ngOnInit(): void {
    this.route.paramMap
    .subscribe((params) => {
      this.urlParams = params;

      this.state = State.LOADING;
      this.searchPackagesGQL.fetch(
        {
          query: this.urlParams.params.q,
          limit: 10,
          offset: 0
        }).subscribe(({data}) => {
          this.state = State.SUCCESS;
          this.packageResult = data;
        });
    });
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
}
