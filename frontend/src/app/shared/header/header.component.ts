import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { User } from 'src/generated/graphql';
import { LoginDialogComponent } from './login-dialog/login-dialog.component';
import { SignUpDialogComponent } from './sign-up-dialog/sign-up-dialog.component';
import { AuthenticationService } from '../../services/authentication.service';
import { Subscription } from 'rxjs';

enum State {
  INIT,
  LOADING,
  ERROR,
  SUCCESS,
  ERROR_NOT_UNIQUE,
}
@Component({
  selector: 'sd-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit, OnDestroy {
  state = State.INIT;

  currentUser: User;
  searchFormGroup: FormGroup;
  private subscription: Subscription;

  constructor(
    public dialog: MatDialog,
    private router: Router,
    private authenticationService: AuthenticationService
  ) {}

  ngOnInit(): void {
    this.subscription = this.authenticationService
      .getUserObservable()
      .subscribe((u) => {
        if (u == null) {
          return;
        }

        u.then((user) => {
          this.currentUser = user;
          this.state = State.SUCCESS;
        }).catch((error) => (this.state = State.ERROR));
      });

    this.searchFormGroup = new FormGroup({
      search: new FormControl(''),
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  openLoginDialog() {
    this.dialog.open(LoginDialogComponent, {
      disableClose: true,
    });
  }

  openSignUpDialog() {
    this.dialog.open(SignUpDialogComponent, {
      disableClose: true,
    });
  }

  goToSearch() {
    this.router.navigate(['/search']);
  }

  search() {
    const query = this.searchFormGroup.value.search;
    this.router.navigate(['/search', { q: query }]);
  }

  goHome() {
    this.router.navigate(['/latest']);
  }

  logout() {
    this.authenticationService.logout();
    setTimeout(() => (this.currentUser = null), 500);
  }
}
