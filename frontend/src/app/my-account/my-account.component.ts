import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { AuthenticationService } from '../services/authentication.service';
import { Router } from '@angular/router';
import { User, MyCatalogsGQL, Catalog, CreateApiKeyGQL, MyApiKeysGQL, DeleteApiKeyGQL, Scope, ApiKey, ApiKeyWithSecret } from 'src/generated/graphql';
import { FormGroup, FormControl } from '@angular/forms';
import * as URLParse from 'url-parse';

enum State {
  INIT,
  LOADING,
  ERROR,
  SUCCESS,
  ERROR_NOT_UNIQUE
}
@Component({
  selector: 'app-my-account',
  templateUrl: './my-account.component.html',
  styleUrls: ['./my-account.component.scss']
})
export class MyAccountComponent implements OnInit {

  State = State;
  state = State.INIT;

  catalogState = State.INIT;
  apiKeysState = State.INIT;
  createAPIKeyState = State.INIT;
  deleteAPIKeyState = State.INIT;

  currentUser:User;

  newAPIKey:string;
  apiKeyDomain:string;
  apiKeyPort:string;

  public myCatalogs:Catalog[];
  public myAPIKeys:ApiKey[];

  createAPIKeyForm:FormGroup;

  constructor(
    private authenticationService:AuthenticationService,
    private router:Router,
    private myCatalogsGQL:MyCatalogsGQL,
    private createAPIKeyGQL:CreateApiKeyGQL,
    private myAPIKeysGQL:MyApiKeysGQL,
    private deleteAPIKeyGQL:DeleteApiKeyGQL,
    private changeDectorRef:ChangeDetectorRef
  ) {  }

  ngOnInit(): void {

    this.state = State.INIT;

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

        if(response.errors.find(e => e.message == "NOT_UNIQUE")) {
          this.createAPIKeyState = State.ERROR_NOT_UNIQUE;
          return;
        }

        this.createAPIKeyState = State.ERROR;
        return;
      }

      const urlParse = URLParse(window.location.href);
      const key = response.data.createAPIKey;
     
      this.apiKeyDomain = urlParse.hostname;
      this.apiKeyPort = urlParse.port;

      this.newAPIKey = btoa(key.id + "." + key.secret);
      
      this.createAPIKeyForm.get('label').setValue('');
      this.refreshAPIKeys();
      this.createAPIKeyState = State.SUCCESS;
    })
  }

  deleteApiKey(id:string) {
    this.deleteAPIKeyState = State.LOADING;
    
    this.deleteAPIKeyGQL.mutate({id: id}).subscribe(response => {
      if(response.errors?.length > 0) {
        this.deleteAPIKeyState = State.ERROR;
        return;
      }

      this.createAPIKeyForm.get('label').setValue('');
      this.refreshAPIKeys();
      this.deleteAPIKeyState = State.SUCCESS;
    });
  }


  logoutClicked() {
    this.authenticationService.logout();
    this.router.navigate(['/']);
  }

  apiKeyCommandString() {
    return `datapm registry add ${this.apiKeyDomain}` + (( this.apiKeyPort != "443") ?  ` --port ${this.apiKeyPort} ` : "") +` ${this.newAPIKey}`
  }

}