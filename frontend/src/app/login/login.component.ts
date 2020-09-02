import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { LoginGQL } from 'src/generated/graphql';
import { AuthenticationService } from '../services/authentication.service';

enum State {
  INIT,
  AWAITING_RESPONSE,
  INCORRECT_LOGIN,
  LOGIN_SUCCESS
}

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  State = State;

  public state = State.INIT;

  loginForm = new FormGroup({
    username: new FormControl(''),
    password: new FormControl('')
  });

  constructor(
    private loginGQL:LoginGQL,
    private authenticationService:AuthenticationService
  ) { }

  ngOnInit(): void {
  }

  formSubmit() {

    this.state = State.AWAITING_RESPONSE;

    this.loginGQL.mutate({username: this.loginForm.value.username, password: this.loginForm.value.password})
      .subscribe((value) => {
        this.authenticationService.setJwt(value.data.login);
        this.state = State.LOGIN_SUCCESS;
      },(error)=> {
        this.state = State.INCORRECT_LOGIN;
        console.error(error);

      });


  }

}
