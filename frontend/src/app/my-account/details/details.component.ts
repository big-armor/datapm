import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { EditPasswordDialogComponent } from '../edit-password-dialog/edit-password-dialog.component';
import { AuthenticationService } from '../../services/authentication.service';
import { getRegistryPort, getRegistryProtocol, getRegistryHostname } from '../../helpers/RegistryAccessHelper';

import {
  APIKey,
  Catalog,
  User,
  CreateAPIKeyGQL,
  MyCatalogsGQL,
  MyAPIKeysGQL,
  DeleteAPIKeyGQL,
  Scope
} from 'src/generated/graphql';
import { FormControl, FormGroup } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { Clipboard } from '@angular/cdk/clipboard'
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

enum State {
  INIT,
  LOADING,
  ERROR,
  SUCCESS,
  ERROR_NOT_UNIQUE,
  ERROR_NO_LABEL
}
@Component({
  selector: "me-details",
  templateUrl: "./details.component.html",
  styleUrls: ["./details.component.scss"]
})
export class DetailsComponent implements OnInit, OnDestroy {
  State = State;
  state = State.INIT;

  currentUser: User
  apiKeysOpenState: boolean = true;
  catalogsOpenState: boolean = false;
  apiKeysState = State.INIT;
  catalogState = State.INIT;
  createAPIKeyState = State.INIT;
  deleteAPIKeyState = State.INIT;
  newAPIKey: string;

  columnsToDisplay = ['label', 'scopes', 'actions'];

  public myCatalogs: Catalog[];
  public myAPIKeys: APIKey[];
  dataSource = new MatTableDataSource<APIKey>()
  createAPIKeyForm: FormGroup;

  private subscription = new Subject();

  constructor(
    public dialog: MatDialog,
    private authenticationService: AuthenticationService,
    private myCatalogsGQL: MyCatalogsGQL,
    private createAPIKeyGQL: CreateAPIKeyGQL,
    private myAPIKeysGQL: MyAPIKeysGQL,
    private deleteAPIKeyGQL: DeleteAPIKeyGQL,
    private clipboard: Clipboard
  ) { }

  ngOnInit(): void {
    this.authenticationService.getUserObservable().pipe(takeUntil(this.subscription)).subscribe(u => {

      if (u == null) {
        return;
      }
      u.then(user => {
        this.currentUser = user;
        this.state = State.SUCCESS
      })
        .catch(error => this.state = State.ERROR)
    });

    this.refreshAPIKeys();
    this.refreshCatalogs();

    this.createAPIKeyForm = new FormGroup({
      label: new FormControl('')
    });

    this.dialog.afterAllClosed.pipe(takeUntil(this.subscription)).subscribe(result => {
      this.authenticationService.refreshUserInfo();
      this.refreshCatalogs();
    })
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  openPasswordDialog() {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.data = this.currentUser

    this.dialog.open(EditPasswordDialogComponent, dialogConfig);
  }

  createAPIKey() {
    if (this.createAPIKeyForm.value.label == '' || this.createAPIKeyForm.value.label == null) {
      this.createAPIKeyState = State.ERROR_NO_LABEL
      return;
    }
    this.createAPIKeyGQL.mutate({
      value: {
        label: this.createAPIKeyForm.value.label,
        scopes: [Scope.MANAGE_API_KEYS, Scope.MANAGE_PRIVATE_ASSETS, Scope.READ_PRIVATE_ASSETS]
      }
    }).pipe(takeUntil(this.subscription)).subscribe(response => {
      if (response.errors?.length > 0) {

        if (response.errors.find(e => e.message == "NOT_UNIQUE")) {
          this.createAPIKeyState = State.ERROR_NOT_UNIQUE;
          return;
        }

        this.createAPIKeyState = State.ERROR;
        return;
      }

      const key = response.data.createAPIKey;

      this.newAPIKey = btoa(key.id + "." + key.secret);

      this.createAPIKeyForm.get('label').setValue('');
      this.refreshAPIKeys();
      this.createAPIKeyState = State.SUCCESS;
    })
  }

  deleteApiKey(id: string) {
    this.deleteAPIKeyState = State.LOADING;

    this.deleteAPIKeyGQL.mutate({ id: id }).pipe(takeUntil(this.subscription)).subscribe(response => {
      if (response.errors?.length > 0) {
        this.deleteAPIKeyState = State.ERROR;
        return;
      }

      this.createAPIKeyForm.get('label').setValue('');
      this.refreshAPIKeys();
      this.deleteAPIKeyState = State.SUCCESS;
    });
  }

  refreshAPIKeys() {
    this.apiKeysState = State.LOADING;

    this.myAPIKeysGQL.fetch({}, { fetchPolicy: 'no-cache' }).pipe(takeUntil(this.subscription)).subscribe(response => {
      if (response.errors?.length > 0) {
        this.apiKeysState = State.ERROR;
        return;
      }
      this.myAPIKeys = response.data.myAPIKeys;
      this.apiKeysState = State.SUCCESS;
    });
  }

  refreshCatalogs() {
    this.myCatalogsGQL.fetch().pipe(takeUntil(this.subscription)).subscribe(response => {
      if (response.errors?.length > 0) {
        this.catalogState = State.ERROR;
        return;
      }
      this.myCatalogs = response.data.myCatalogs;
      this.catalogState = State.SUCCESS;
    });
  }

  apiKeyCommandString() {
    const hostname = getRegistryHostname();
    const protocol = getRegistryProtocol();
    const port = getRegistryPort();
    let protocolOption = "";
    let portOption = "";

    if (protocol == "https" && port != 443) {
      portOption = "--port " + port;
    } else if (protocol == "http" && port != 80) {
      portOption = " --port " + port;
    }

    if (protocol == "http") {
      protocolOption = " --protocol " + protocol;
    }

    return `datapm registry add ${hostname}` + portOption + protocolOption + ` ${this.newAPIKey}`
  }

  copyKeyToClipboard() {
    this.clipboard.copy(this.apiKeyCommandString())
  }
}
