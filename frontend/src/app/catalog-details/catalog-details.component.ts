import { Component, OnInit } from '@angular/core';
import { GetCatalogGQL, GetCatalogQuery } from 'src/generated/graphql';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-catalog-details',
  templateUrl: './catalog-details.component.html',
  styleUrls: ['./catalog-details.component.scss']
})
export class CatalogDetailsComponent implements OnInit {

  getCatalogQuery:GetCatalogQuery
  urlParams:any

  constructor(
    private getCatalogGQL:GetCatalogGQL,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.paramMap
    .subscribe((params) => {
      this.urlParams = params;

      this.getCatalogGQL.watch({identifier: {catalogSlug: this.urlParams.params.catalogSlug, registryHostname: "test", registryPort: 4000}}).valueChanges.subscribe(({data}) => {
        this.getCatalogQuery = data;
      });
    });


  }

}
