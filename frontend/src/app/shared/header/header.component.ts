import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { User } from 'src/generated/graphql';
import { LoginDialogComponent } from './login-dialog/login-dialog.component';
import { SignUpDialogComponent } from './sign-up-dialog/sign-up-dialog.component';

@Component({
  selector: 'sd-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {

  currentUser:User;
  searchFormGroup:FormGroup;

  constructor(
    public dialog: MatDialog,
    private router: Router) {}

  ngOnInit(): void {
    this.searchFormGroup = new FormGroup({
      search: new FormControl('')
    });
  }

  openLoginDialog() {
    this.dialog.open(LoginDialogComponent);
  }

  openSignUpDialog() {
    this.dialog.open(SignUpDialogComponent);
  }

  goToSearch() {
    this.router.navigate(['/search']);
    console.log("hello")
  }

  search() {
    const query = this.searchFormGroup.value.search;

    this.router.navigate(['/search',{q: query}])

  }

}