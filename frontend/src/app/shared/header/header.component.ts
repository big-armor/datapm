import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { LoginDialogComponent } from './login-dialog/login-dialog.component';
import { SignUpDialogComponent } from './sign-up-dialog/sign-up-dialog.component';

@Component({
  selector: 'sd-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {

  constructor(public dialog: MatDialog) {}

  openLoginDialog() {
    this.dialog.open(LoginDialogComponent);
  }

  openSignUpDialog() {
    this.dialog.open(SignUpDialogComponent);
  }


  ngOnInit(): void {
  }

}