import { Component, OnInit } from '@angular/core';
import { AuthenticationService } from '../services/authentication.service';
import { Router } from '@angular/router';
import { User, MyCatalogsGQL, Catalog } from 'src/generated/graphql';

enum State {
  LOADING,
  ERROR,
  SUCCESS
}
@Component({
  selector: 'app-my-account',
  templateUrl: './my-account.component.html',
  styleUrls: ['./my-account.component.scss']
})
export class MyAccountComponent implements OnInit {

  State = State;
  state = State.LOADING;

  catalogState = State.LOADING;

  currentUser:User;

  public myCatalogs:Catalog[];

  constructor(
    private authenticationService:AuthenticationService,
    private router:Router,
    private myCatalogsGQL:MyCatalogsGQL
  ) {

  }

  ngOnInit(): void {

    this.authenticationService.getUserObservable().subscribe(u => {

      if(u == null) {
        return;
      }
      
      u.then(user => {
        this.currentUser = user;
        this.state = State.SUCCESS
      })
      .catch(error => this.state = State.ERROR )
    });

    this.myCatalogsGQL.fetch().subscribe(response => {
      if(response.errors?.length > 0) {
        this.catalogState = State.ERROR;
        return;
      }

      this.myCatalogs = response.data.myCatalogs;
    })
  }


  logoutClicked() {
    this.authenticationService.logout();
    this.router.navigate(['/']);
  }

}
