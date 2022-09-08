import { Component, OnInit, Inject, ChangeDetectorRef, OnDestroy } from "@angular/core";
import { FormGroup, FormControl } from "@angular/forms";
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { MatSlideToggleChange } from "@angular/material/slide-toggle";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import {
    UpdateMeGQL,
    UsernameAvailableGQL,
    UpdateCatalogGQL,
    User,
    SetMyCoverImageGQL,
    SetMyAvatarImageGQL,
    CurrentUser
} from "../../../../generated/graphql";
import { ConfirmationDialogComponent } from "../../confirmation-dialog/confirmation-dialog.component";
import { ImageService } from "../../../services/image.service";
import { usernameValidator } from "src/app/helpers/validators";

@Component({
    selector: "app-edit-account-dialog",
    templateUrl: "./edit-account-dialog.component.html",
    styleUrls: ["./edit-account-dialog.component.scss"]
})
export class EditAccountDialogComponent implements OnInit, OnDestroy {
    public form: FormGroup;
    public currentUser: CurrentUser;
    public submitDisabled: boolean = false;
    private confirmDialogOpened: boolean = false;

    private subscription = new Subject();

    public nameIsPublic: boolean = false;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: CurrentUser,
        public dialogRef: MatDialogRef<EditAccountDialogComponent>,
        public dialog: MatDialog,
        private updateMeGQL: UpdateMeGQL,
        private setMyCoverImageGQL: SetMyCoverImageGQL,
        private setMyAvatarImageGQL: SetMyAvatarImageGQL,
        private imageService: ImageService,
        private usernameAvailableGQL: UsernameAvailableGQL,
        private updateCatalogGQL: UpdateCatalogGQL,
        private componentChangeDetector: ChangeDetectorRef
    ) {}

    public ngOnInit(): void {
        this.currentUser = this.data;

        this.form = new FormGroup({
            username: new FormControl(this.currentUser.user.username, {
                asyncValidators: [
                    usernameValidator(this.usernameAvailableGQL, this.componentChangeDetector, this.data.user.username)
                ]
            }),
            firstName: new FormControl(this.currentUser.user.firstName),
            lastName: new FormControl(this.currentUser.user.lastName),
            location: new FormControl(this.currentUser.user.location),
            description: new FormControl(this.currentUser.user.description),
            twitterHandle: new FormControl(this.currentUser.user.twitterHandle),
            website: new FormControl(this.currentUser.user.website),
            emailAddress: new FormControl(this.currentUser.user.emailAddress),
            gitHubHandle: new FormControl(this.currentUser.user.gitHubHandle),
            locationIsPublic: new FormControl(this.currentUser.user.locationIsPublic),
            websiteIsPublic: new FormControl(this.currentUser.user.websiteIsPublic),
            emailAddressIsPublic: new FormControl(this.currentUser.user.emailAddressIsPublic),
            twitterHandleIsPublic: new FormControl(this.currentUser.user.twitterHandleIsPublic),
            gitHubHandleIsPublic: new FormControl(this.currentUser.user.gitHubHandleIsPublic)
        });

        this.nameIsPublic = this.currentUser.user.nameIsPublic;
    }

    public ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    public submit(): void {
        this.form.markAllAsTouched();
        this.form.markAsDirty();
        if (this.form.invalid) {
            return;
        }

        this.updateMeGQL
            .mutate({
                value: {
                    ...this.form.value,
                    nameIsPublic: this.nameIsPublic
                }
            })
            .pipe(takeUntil(this.subscription))
            .subscribe((response) => {
                if (response.errors) {
                    console.error(response.errors);
                }
            });

        if (this.username.value != this.currentUser.user.username) {
            this.updateCatalogGQL
                .mutate({
                    identifier: {
                        catalogSlug: this.currentUser.user.username
                    },
                    value: {
                        newSlug: this.username.value,
                        displayName: this.username.value
                    }
                })
                .pipe(takeUntil(this.subscription))
                .subscribe((response) => {
                    if (response.errors) {
                        console.error(response.errors);
                    }
                });
        }
        this.closeDialog();
    }

    public closeDialog(): void {
        this.dialogRef.close();
    }

    public openConfirmDialog(): void {
        if (this.confirmDialogOpened === false) {
            this.dialog.open(ConfirmationDialogComponent, {
                data:
                    "Changing your username will change your catalog name and potentially break links you have to packages outside of datapm."
            });
            this.confirmDialogOpened = true;
        }
    }

    public toggleNameIsPublic(ev: MatSlideToggleChange): void {
        this.nameIsPublic = ev.checked;
    }

    public uploadAvatar(data: any): void {
        this.setMyAvatarImageGQL
            .mutate({ image: { base64: data } })
            .subscribe(() => this.imageService.loadUserAvatar(this.currentUser.user.username, true));
    }

    public uploadCover(data: any): void {
        this.setMyCoverImageGQL
            .mutate({ image: { base64: data } })
            .subscribe(() => this.imageService.loadUserCover(this.currentUser.user.username, true));
    }

    public get username(): FormControl {
        return this.form.get("username")! as FormControl;
    }
}
