import { Component, OnInit } from '@angular/core';
import { AuthenticationService } from '../services/authentication.service';
import { Router } from '@angular/router';
import { User } from 'src/generated/graphql';

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

  currentUser:User;

  constructor(
    private authenticationService:AuthenticationService,
    private router:Router
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
  }


  logoutClicked() {
    this.authenticationService.logout();
    this.router.navigate(['/']);
  }

}
