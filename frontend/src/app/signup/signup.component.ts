import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthenticationService } from '../services/authentication.service';
import { FormGroup, FormControl, AbstractControl, ValidationErrors, AsyncValidatorFn, MaxLengthValidator } from '@angular/forms';
import { CreateMeGQL, UsernameAvailableGQL, EmailAddressAvailableGQL } from '../../generated/graphql'
enum State {
  INIT,
  AWAITING_RESPONSE,
  REJECTED,
  ERROR,
  SUCCESS
}


function usernameValidator(usernameAvailableGQL: UsernameAvailableGQL): AsyncValidatorFn {
  return (control: AbstractControl): Promise<ValidationErrors | null> => {
    return new Promise<ValidationErrors | null>((success,error) => {
      if(control.value == null) {
        success({
          usernameAvailable: true
        });
        return;
      }
      usernameAvailableGQL.fetch({username: control.value}).subscribe(result => {
        if(result.error) {
          error(result.error);
        } else {
          if(result.data.usernameAvailable) {
            success(null)
          } else {
            success({
              usernameAvailable: true
            })
          }
        }
      })
    })
  };
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
    username: new FormControl('',[],[usernameValidator(this.usernameAvailableGQL)]),
    emailAddress: new FormControl(''),
    password: new FormControl('')
  });

  constructor(
    private router:Router,
    private authenticationService:AuthenticationService,
    private createMeGQL:CreateMeGQL,
    private usernameAvailableGQL:UsernameAvailableGQL,
    private emailAddressAvailableGQL:EmailAddressAvailableGQL
  ) {
    
  }

  ngOnInit(): void {
  }

  formSubmit() {
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
