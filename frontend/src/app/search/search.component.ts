import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SearchPackagesGQL, Package, SearchPackagesQuery } from 'src/generated/graphql';


enum State {
  LOADING,
  SUCCESS,
  ERROR
}


@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss']
})
export class SearchComponent implements OnInit {


  State = State;

  state = State.LOADING;

  urlParams:any;

  packageResult:SearchPackagesQuery

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

}
