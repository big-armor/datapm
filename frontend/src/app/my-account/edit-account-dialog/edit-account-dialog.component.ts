import { Component, OnInit, Inject, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { FormGroup, FormControl, AsyncValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';
import { UpdateMeGQL, UsernameAvailableGQL, UpdateCatalogGQL, User } from '../../../generated/graphql';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';

function usernameValidator(usernameAvailableGQL: UsernameAvailableGQL, componentChangeDetector: ChangeDetectorRef, currentUsername: string): AsyncValidatorFn {
  return (control: AbstractControl): Promise<ValidationErrors | null> => {
    return new Promise<ValidationErrors | null>((success, error) => {
      if (control.value == currentUsername) {
        success(null)
        return;
      }
      if (control.value == "" || control.value == null) {
        success({
          REQUIRED: true
        });
        return;
      }
      usernameAvailableGQL.fetch({ username: control.value }).subscribe(result => {
        if (result.errors?.length > 0) {
          success({
            [result.errors[0].message]: true
          });
        } else {
          if (result.data.usernameAvailable) {
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

@Component({
  selector: "app-edit-account-dialog",
  templateUrl: "./edit-account-dialog.component.html",
  styleUrls: ["./edit-account-dialog.component.scss"]
})
export class EditAccountDialogComponent implements OnInit, OnDestroy {
  public form: FormGroup;
  private currentUser: User;
  public submitDisabled: boolean = false;
  private confirmDialogOpened: boolean = false;

  private subscription = new Subject();

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: User,
    public dialogRef: MatDialogRef<EditAccountDialogComponent>,
    public dialog: MatDialog,
    private updateMeGQL: UpdateMeGQL,
    private usernameAvailableGQL: UsernameAvailableGQL,
    private updateCatalogGQL: UpdateCatalogGQL,
    private componentChangeDetector: ChangeDetectorRef,
  ) { }

  ngOnInit(): void {
    this.currentUser = this.data;

    this.form = new FormGroup({
      username: new FormControl(this.currentUser.username, { asyncValidators: [usernameValidator(this.usernameAvailableGQL, this.componentChangeDetector, this.data.username)] }),
      firstName: new FormControl(this.currentUser.firstName),
      lastName: new FormControl(this.currentUser.lastName),
      location: new FormControl(this.currentUser.location),
      twitterHandle: new FormControl(this.currentUser.twitterHandle),
      website: new FormControl(this.currentUser.website),
      emailAddress: new FormControl(this.currentUser.emailAddress),
      gitHubHandle: new FormControl(this.currentUser.gitHubHandle),
      nameIsPublic: new FormControl(this.currentUser.nameIsPublic)
    })
  }

  ngOnDestroy() {
    this.subscription.unsubscribe()
  }

  submit() {
    this.form.markAllAsTouched();
    this.form.markAsDirty();
    if (this.form.invalid) {
      return;
    }
    this.updateMeGQL.mutate({
      value: {
        username: this.username.value,
        firstName: this.firstName.value,
        lastName: this.lastName.value,
        // location: this.location.value,
        // twitterHandle: this.twitterHandle.value,
        // website: this.website.value,
        email: this.emailAddress.value,
        // gitHubHandle: this.gitHubHandle.value,
        // nameIsPublic: this.nameIsPublic.value
      }
    }).pipe(takeUntil(this.subscription)).subscribe(response => {
      if (response.errors) {
        console.error(response.errors)
      }
    })

    if (this.username.value != this.currentUser.username) {
      this.updateCatalogGQL.mutate({
        identifier: {
          catalogSlug: this.currentUser.username
        },
        value: {
          newSlug: this.username.value,
          displayName: this.username.value
        }
      }).pipe(takeUntil(this.subscription)).subscribe(response => {
        if (response.errors) {
          console.error(response.errors)
        }
      })
    }
    this.closeDialog()
  }

  closeDialog() {
    this.dialogRef.close();
  }

  openConfirmDialog() {
    if (this.confirmDialogOpened === false) {
      this.dialog.open(ConfirmationDialogComponent);
      this.confirmDialogOpened = true;
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
