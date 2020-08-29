import { Component } from '@angular/core';
import { MyCatalogsGQL, MyCatalogsQuery, MeGQL, MeQuery } from '../generated/graphql'
import { pluck } from 'rxjs/operators'

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'datapm-registry-frontend';


  meQuery:MeQuery;
  myCatalogsQuery:MyCatalogsQuery;
  
  constructor(
    private meGql: MeGQL,
    private myCatalogsGql: MyCatalogsGQL) {}

  ngOnInit() {
    this.meGql.watch().valueChanges.subscribe(({ data, loading }) => {
      this.meQuery = data;
    });

    this.myCatalogsGql.watch().valueChanges.subscribe(({data,loading}) => {
      this.myCatalogsQuery = data;
    });
  }
}
