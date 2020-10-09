import { Component, OnInit, Inject } from '@angular/core';
import { FormGroup, FormBuilder, FormControl } from '@angular/forms';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { User } from '../../../generated/graphql';

import { Apollo } from 'apollo-angular'
import gql from 'graphql-tag';

@Component({
  selector: 'app-edit-account-dialog',
  templateUrl: './edit-account-dialog.component.html',
  styleUrls: ['./edit-account-dialog.component.scss']
})
export class EditAccountDialogComponent implements OnInit {
  public form: FormGroup;
  private currentUser: User;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: User,
    private apollo: Apollo,
    private formBuilder: FormBuilder,
    // private updateMeGQL: UpdateMeGQL
  ) { }

  ngOnInit(): void {
    this.currentUser = this.data;

    this.form = this.formBuilder.group({
      username: [this.currentUser.username],
      firstName: [this.currentUser.firstName],
      lastName: [this.currentUser.lastName],
      location: [this.currentUser.location],
      twitterHandle: [this.currentUser.twitterHandle],
      website: [this.currentUser.website],
      emailAddress: [this.currentUser.emailAddress],
      gitHubHandle: [this.currentUser.gitHubHandle],
      nameIsPublic: [this.currentUser.nameIsPublic]
    })

    console.log(this.form.value)
  }

  submit() {
    this.form.markAllAsTouched();
    this.form.markAsDirty();
    if (this.form.invalid) {
      return;
    }
  }

  get username() {
    return this.form.get('username')! as FormControl;
  }

  get firstName() {
    return this.form.get('firstName')! as FormControl;
  }

  get lastName() {
    return this.form.get('lastName')! as FormControl;
  }

  get location() {
    return this.form.get('location')! as FormControl;
  }

  get twitterHandle() {
    return this.form.get('twitterHandle')! as FormControl;
  }

  get website() {
    return this.form.get('website')! as FormControl;
  }

  get emailAddress() {
    return this.form.get('emailAddress')! as FormControl;
  }

  get gitHubHandle() {
    return this.form.get('gitHubHandle')! as FormControl;
  }

  get nameIsPublic() {
    return this.form.get('nameIsPublic')! as FormControl;
  }
}
