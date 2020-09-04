import { Component, OnInit } from '@angular/core';
import { AuthenticationService } from '../services/authentication.service';
import { Router } from '@angular/router';
import { User, MyCatalogsGQL, Catalog, CreateApiKeyGQL, MyApiKeysGQL, DeleteApiKeyGQL, Scope, ApiKey } from 'src/generated/graphql';
import { FormGroup, FormControl } from '@angular/forms';

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
  apiKeysState = State.LOADING;
  createAPIKeyState = State.LOADING;

  currentUser:User;

  public myCatalogs:Catalog[];
  public myAPIKeys:ApiKey[];

  createAPIKeyForm:FormGroup;

  constructor(
    private authenticationService:AuthenticationService,
    private router:Router,
    private myCatalogsGQL:MyCatalogsGQL,
    private createAPIKeyGQL:CreateApiKeyGQL,
    private myAPIKeysGQL:MyApiKeysGQL,
    private deleteAPIKeyGQL:DeleteApiKeyGQL
  ) {  }

  ngOnInit(): void {

    this.createAPIKeyForm = new FormGroup({
      label: new FormControl('')
    });

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
      this.catalogState = State.SUCCESS;

    });

    this.refreshAPIKeys();
    

  }

  refreshAPIKeys() {
    this.apiKeysState = State.LOADING;

    this.myAPIKeysGQL.fetch({},{fetchPolicy: 'no-cache'}).subscribe(response => {
      if(response.errors?.length > 0) {
        this.apiKeysState = State.ERROR;
        return;
      }
      this.myAPIKeys = response.data.myAPIKeys;
      this.apiKeysState = State.SUCCESS;

    });
  }

  createAPIKey() {
    this.createAPIKeyGQL.mutate({
      value: {
        label: this.createAPIKeyForm.value.label,
        scopes: [Scope.ManageApiKeys,Scope.ManagePrivateAssets,Scope.ReadPrivateAssets]
      }
    }).subscribe(response => {
      if(response.errors?.length > 0) {
        this.createAPIKeyState = State.ERROR;
        return;
      }

      this.createAPIKeyForm.get('label').setValue('');
      this.refreshAPIKeys();
      this.createAPIKeyState = State.SUCCESS;
    })
  }

  deleteApiKey(id:string) {
    this.deleteAPIKeyGQL.mutate({id: id}).subscribe(response => {
      if(response.errors?.length > 0) {
        this.createAPIKeyState = State.ERROR;
        return;
      }

      this.createAPIKeyForm.get('label').setValue('');
      this.refreshAPIKeys();
      this.createAPIKeyState = State.SUCCESS;
    });
  }


  logoutClicked() {
    this.authenticationService.logout();
    this.router.navigate(['/']);
  }

}