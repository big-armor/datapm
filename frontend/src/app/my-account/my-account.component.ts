import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { FormGroup, FormControl } from "@angular/forms";
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { AuthenticationService } from "../services/authentication.service";
import { APIKey, Catalog, User } from 'src/generated/graphql';
import { EditAccountDialogComponent } from "./edit-account-dialog/edit-account-dialog.component";

enum State {
  INIT,
  LOADING,
  ERROR,
  SUCCESS,
  ERROR_NOT_UNIQUE
}
@Component({
  selector: "app-my-account",
  templateUrl: "./my-account.component.html",
  styleUrls: ["./my-account.component.scss"]
})
export class MyAccountComponent implements OnInit {
  State = State;
  state = State.INIT;

  catalogState = State.INIT;
  apiKeysState = State.INIT;
  createAPIKeyState = State.INIT;
  deleteAPIKeyState = State.INIT;

  currentUser: User;

  newAPIKey: string;

  public myCatalogs: Catalog[];
  public myAPIKeys: APIKey[];
  public routes = [];
  public selectedTab = 0;

  createAPIKeyForm: FormGroup;

  constructor(
    private authenticationService: AuthenticationService,
    private router: Router,
    public dialog: MatDialog
  ) {
    let prefix = "/me";
    this.routes = [
      { linkName: 'details', url: prefix },
      { linkName: 'packages', url: prefix + '/packages' },
      { linkName: 'collections', url: prefix + '/collections' },
      { linkName: 'activity', url: prefix + '/activity' },
    ]
  }

  ngOnInit(): void {
    this.selectTab(0);
    this.state = State.INIT;

    this.createAPIKeyForm = new FormGroup({
      label: new FormControl('')
    });

    this.authenticationService.getUserObservable().subscribe(u => {
      if (u == null) {
        return;
      }
      u.then(user => {
        this.currentUser = user;
        this.state = State.SUCCESS;
      })
        .catch(error => this.state = State.ERROR)
    });
  }

  openEditDialog() {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.data = this.currentUser

    this.dialog.open(EditAccountDialogComponent, dialogConfig);

    this.dialog.afterAllClosed.subscribe(result => {
      this.authenticationService.refreshUserInfo()
    });
  }

  public selectTab(index) {
    this.router.navigate([this.routes[index].url])
    this.selectedTab = index;
  }

  logoutClicked() {
    this.authenticationService.logout();
    this.router.navigate(['/']);
  }
}
