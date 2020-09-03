import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthenticationService } from '../services/authentication.service';
import { FormGroup, FormControl } from '@angular/forms';
import { CreateMeGQL } from '../../generated/graphql'
enum State {
  INIT,
  AWAITING_RESPONSE,
  REJECTED,
  ERROR,
  SUCCESS
}

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss']
})
export class SignupComponent implements OnInit {
  State = State;

  state = State.INIT;

  signUpForm = new FormGroup({
    username: new FormControl(''),
    emailAddress: new FormControl(''),
    password: new FormControl('')
  });

  constructor(
    private router:Router,
    private authenticationService:AuthenticationService,
    private createMeGQL:CreateMeGQL
  ) {
    
  }

  ngOnInit(): void {
  }

  onSubmit() {
    this.createMeGQL.mutate(
      {value: 
        {
          username: this.signUpForm.value.username,
          password: this.signUpForm.value.password,
          emailAddress: this.signUpForm.value.emailAddress
        }
      }
    ).toPromise().then((result) => {
      this.state = State.ERROR;
    }).catch(error => {

    });
  }

}
