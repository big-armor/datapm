import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { LoginGQL } from 'src/generated/graphql';
import { AuthenticationService } from '../services/authentication.service';
import { Router } from '@angular/router';
import { ApolloError } from '@apollo/client/core';

enum State {
  LOGGED_OUT,
  AWAITING_RESPONSE,
  INCORRECT_LOGIN,
  LOGGED_IN,
  LOGIN_ERROR
}

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  State = State;

  public state = State.LOGGED_OUT;

  loginForm = new FormGroup({
    username: new FormControl(''),
    password: new FormControl('')
  });

  constructor(
    private loginGQL:LoginGQL,
    private authenticationService:AuthenticationService,
    private router:Router
  ) { }

  ngOnInit(): void {

    if(this.authenticationService.currentUserValue != null)
      this.state = State.LOGGED_IN;

    this.authenticationService.getUserObservable().subscribe((userPromise) => {

      if(userPromise == null) {
        this.state = State.LOGGED_OUT;
        return;
      }

      userPromise.then((user) => {
        if(user != null)
          this.state = State.LOGGED_IN;
        else {
          if(this.state == State.LOGGED_IN)
            this.state = State.LOGGED_OUT;
        }
      })
    });
  }

  formSubmit() {

    this.state = State.AWAITING_RESPONSE;

    this.authenticationService
      .login(this.loginForm.value.username, this.loginForm.value.password)
      .then((user) => {
        this.state = State.LOGGED_IN;
        this.router.navigate(['/']);
      }).catch((error: ApolloError) => {

        if(error.graphQLErrors.find(e => e.extensions.code == "LOGIN_FAILED") != null)
          this.state = State.INCORRECT_LOGIN;
        else 
          this.state = State.LOGIN_ERROR;
          
      });


  }

}
