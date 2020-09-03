import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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


function usernameValidator(usernameAvailableGQL: UsernameAvailableGQL,componentChangeDetector:ChangeDetectorRef): AsyncValidatorFn {
  return (control: AbstractControl): Promise<ValidationErrors | null> => {
    return new Promise<ValidationErrors | null>((success,error) => {
      if(control.value == "" || control.value == null) {
        success({
          REQUIRED: true
        });
        return;
      }
      usernameAvailableGQL.fetch({username: control.value}).subscribe(result => {
        if(result.errors?.length > 0) {
          success({
            [result.errors[0].message] : true
          });
        } else {
          if(result.data.usernameAvailable) {
            success(null)
          } else {
            success({
              NOT_AVAILABLE: true
            })
          }
        }
        control.markAsDirty();
        componentChangeDetector.detectChanges();
      })
    })
  };
}

function emailAddressValidator(emailAddressAvailableGQL: EmailAddressAvailableGQL,componentChangeDetector:ChangeDetectorRef): AsyncValidatorFn {
  return (control: AbstractControl): Promise<ValidationErrors | null> => {
    return new Promise<ValidationErrors | null>((success,error) => {
      if(control.value == "" || control.value == null) {
        success({
          REQUIRED: true
        });
        return;
      }
      emailAddressAvailableGQL.fetch({emailAddress: control.value}).subscribe(result => {
        if(result.errors?.length > 0) {
          success({
            [result.errors[0].message] : true
          });
        } else {
          if(result.data.emailAddressAvailable) {
            success(null)
          } else {
            success({
              NOT_AVAILABLE: true
            })
          }
        }
        control.markAllAsTouched();
        componentChangeDetector.detectChanges();
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

  signUpForm:FormGroup


  constructor(
    private router:Router,
    private authenticationService:AuthenticationService,
    private createMeGQL:CreateMeGQL,
    private usernameAvailableGQL:UsernameAvailableGQL,
    private emailAddressAvailableGQL:EmailAddressAvailableGQL,
    private componentChangeDetector:ChangeDetectorRef
  ) {
    
  }

  ngOnInit(): void {
    this.signUpForm = new FormGroup({
      username: new FormControl('',{asyncValidators: [usernameValidator(this.usernameAvailableGQL,this.componentChangeDetector)],updateOn: 'blur'}),
      emailAddress: new FormControl('',{asyncValidators: [emailAddressValidator(this.emailAddressAvailableGQL,this.componentChangeDetector)],updateOn: 'blur'}),
      password: new FormControl('')
    });

    
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
