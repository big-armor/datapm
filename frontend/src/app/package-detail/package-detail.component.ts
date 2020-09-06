import { Component, OnInit } from '@angular/core';
import { Package, PackageGQL, PackageQuery } from 'src/generated/graphql';
import { Route, ActivatedRoute } from '@angular/router';

enum State {
  LOADING,
  SUCCESS,
  ERROR
}


@Component({
  selector: 'app-package-detail',
  templateUrl: './package-detail.component.html',
  styleUrls: ['./package-detail.component.scss']
})
export class PackageDetailComponent implements OnInit {

  State = State;

  state = State.LOADING;

  package:Package;
  urlParams:any;
  packageQuery:PackageQuery;

  constructor(
    private packageGQL:PackageGQL,
    private route:ActivatedRoute
  ) { }

  ngOnInit(): void {

    this.route.paramMap
    .subscribe((params) => {
      this.urlParams = params;

      this.state = State.LOADING;
      this.packageGQL.watch(
        {
          identifier: {
            catalogSlug: this.urlParams.params.catalogSlug,
            packageSlug: this.urlParams.params.packageSlug
          }
        }).valueChanges.subscribe(({data}) => {
          this.state = State.SUCCESS;
          this.packageQuery = data;
        });
    });

  }

}
