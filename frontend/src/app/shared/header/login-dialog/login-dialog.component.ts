import { Component, OnInit } from '@angular/core';
import {FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthenticationService } from 'src/app/services/authentication.service';
import { LoginGQL } from 'src/generated/graphql';
enum State {
  LOGGED_OUT,
  AWAITING_RESPONSE,
  INCORRECT_LOGIN,
  LOGGED_IN,
  LOGIN_ERROR
}

@Component({
  selector: 'app-login-dialog',
  templateUrl: './login-dialog.component.html',
  styleUrls: ['./login-dialog.component.scss']
})
export class LoginDialogComponent implements OnInit {

  State = State;

  public state = State.LOGGED_OUT;

  loginForm = new FormGroup({
    username: new FormControl('', Validators.required),
    password: new FormControl('', Validators.required)
  });

  constructor(
    private loginGQL:LoginGQL,
    private authenticationService:AuthenticationService,
    private router:Router
  ) { }

  ngOnInit(): void {

    if(this.authenticationService.currentUser != null)
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

        const returnUrl = this.router.parseUrl(this.router.url).queryParams["returnUrl"] || null;

        if(returnUrl) {
          this.router.navigate([returnUrl]);
        } else {
          this.router.navigate(['/']);
        }

      }).catch((error: any) => {
        if(error.errors?.find(e => e.extensions.code == "LOGIN_FAILED") != null)
          this.state = State.INCORRECT_LOGIN;
        else
          this.state = State.LOGIN_ERROR;

      });

  }

}
