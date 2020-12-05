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
    SetMyAvatarImageGQL
} from "../../../generated/graphql";
import { ConfirmationDialogComponent } from "../confirmation-dialog/confirmation-dialog.component";
import { ImageService } from "../../services/image.service";
import { usernameValidator } from "src/app/helpers/validators";

@Component({
    selector: "app-edit-account-dialog",
    templateUrl: "./edit-account-dialog.component.html",
    styleUrls: ["./edit-account-dialog.component.scss"]
})
export class EditAccountDialogComponent implements OnInit, OnDestroy {
    public form: FormGroup;
    public currentUser: User;
    public submitDisabled: boolean = false;
    private confirmDialogOpened: boolean = false;

    private subscription = new Subject();

    public nameIsPublic: boolean = false;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: User,
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

    ngOnInit(): void {
        this.currentUser = this.data;

        this.form = new FormGroup({
            username: new FormControl(this.currentUser.username, {
                asyncValidators: [
                    usernameValidator(this.usernameAvailableGQL, this.componentChangeDetector, this.data.username)
                ]
            }),
            firstName: new FormControl(this.currentUser.firstName),
            lastName: new FormControl(this.currentUser.lastName),
            location: new FormControl(this.currentUser.location),
            description: new FormControl(this.currentUser.description),
            twitterHandle: new FormControl(this.currentUser.twitterHandle),
            website: new FormControl(this.currentUser.website),
            emailAddress: new FormControl(this.currentUser.emailAddress),
            gitHubHandle: new FormControl(this.currentUser.gitHubHandle),
            locationIsPublic: new FormControl(this.currentUser.locationIsPublic),
            websiteIsPublic: new FormControl(this.currentUser.websiteIsPublic),
            emailAddressIsPublic: new FormControl(this.currentUser.emailAddressIsPublic),
            twitterHandleIsPublic: new FormControl(this.currentUser.twitterHandleIsPublic),
            gitHubHandleIsPublic: new FormControl(this.currentUser.gitHubHandleIsPublic)
        });

        this.nameIsPublic = this.currentUser.nameIsPublic;
    }

    ngOnDestroy() {
        this.subscription.unsubscribe();
    }

    submit() {
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

        if (this.username.value != this.currentUser.username) {
            this.updateCatalogGQL
                .mutate({
                    identifier: {
                        catalogSlug: this.currentUser.username
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

    closeDialog() {
        this.dialogRef.close();
    }

    openConfirmDialog() {
        if (this.confirmDialogOpened === false) {
            this.dialog.open(ConfirmationDialogComponent);
            this.confirmDialogOpened = true;
        }
    }

    toggleNameIsPublic(ev: MatSlideToggleChange) {
        this.nameIsPublic = ev.checked;
    }

    uploadAvatar(data: any) {
        this.setMyAvatarImageGQL.mutate({ image: { base64: data } }).subscribe(() => {
            this.imageService.refreshAvatar(this.currentUser.username);
        });
    }

    uploadCover(data: any) {
        this.setMyCoverImageGQL.mutate({ image: { base64: data } }).subscribe(() => {
            this.imageService.refreshCover();
        });
    }

    get username() {
        return this.form.get("username")! as FormControl;
    }

    public openCoverUploadDialog(): void {
        // this.imageUploadService.openImageUploadDialog(this.setMyCoverImageGQL);
    }
}
