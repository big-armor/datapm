import { Component, Inject } from "@angular/core";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { catalogSlugValidator } from "src/app/helpers/validators";
import { PageState } from "src/app/models/page-state";
import {
    Catalog,
    CurrentUser,
    Permission,
    SetCatalogAvatarImageGQL,
    SetCatalogCoverImageGQL,
    UpdateCatalogGQL} from "src/generated/graphql";
import { ConfirmationDialogComponent } from "../confirmation-dialog/confirmation-dialog.component";
import { ImageService } from "../../services/image.service";
import { AuthenticationService } from "src/app/services/authentication.service";
import { takeUntil } from "rxjs/operators";
import { Subject } from "rxjs";

@Component({
    selector: "app-edit-catalog",
    templateUrl: "./edit-catalog.component.html",
    styleUrls: ["./edit-catalog.component.scss"]
})
export class EditCatalogComponent {
    private readonly destroy = new Subject<void>();

    form: FormGroup;
    public readonly errorMsg = {
        displayName: {
            required: "Catalog name is required"
        },
        newSlug: {
            REQUIRED: "Catalog slug is required",
            INVALID_CHARACTERS:
                "Catalog slug must contain only numbers, letters, hyphens, and may not start or end with a hyphen.",
            TOO_LONG: "Catalog slug must be less than 40 characters long.",
            NOT_AVAILABLE: "That catalog slug is not available."
        }
    };
    state: PageState = "INIT";
    confirmDialogOpened: boolean = false;
    Permission = Permission;

    public currentUser: CurrentUser;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: Catalog,
        private setCatalogAvatarImageGQL: SetCatalogAvatarImageGQL,
        private setCatalogCoverImage: SetCatalogCoverImageGQL,
        private updateCatalog: UpdateCatalogGQL,
        private dialogRef: MatDialogRef<EditCatalogComponent>,
        private dialog: MatDialog,
        private imageService: ImageService,
        private authenticationService: AuthenticationService
    ) {
        this.form = new FormGroup({
            isPublic: new FormControl(data.isPublic),
            unclaimed: new FormControl(data.unclaimed),
            displayName: new FormControl(data.displayName, {
                validators: [Validators.required]
            }),
            newSlug: new FormControl(data.identifier.catalogSlug, {
                asyncValidators: [catalogSlugValidator()]
            }),
            description: new FormControl(data.description)
        });

        this.authenticationService.currentUser.pipe(takeUntil(this.destroy)).subscribe((u) => (this.currentUser = u));
    }

    public uploadAvatar(data: any): void {
        this.setCatalogAvatarImageGQL
            .mutate({
                identifier: {
                    catalogSlug: this.data.identifier.catalogSlug
                },
                image: {
                    base64: data
                }
            })
            .subscribe(() => this.imageService.loadCatalogAvatar(this.data.identifier.catalogSlug, true));
    }

    public uploadCover(data: any): void {
        this.setCatalogCoverImage
            .mutate({
                identifier: {
                    catalogSlug: this.data.identifier.catalogSlug
                },
                image: {
                    base64: data
                }
            })
            .subscribe(() => this.imageService.loadCatalogCover(this.data.identifier.catalogSlug, true));
    }

    public save(): void {
        if (!this.form.valid) {
            return;
        }

        if (!this.data.myPermissions.includes(Permission.MANAGE)) delete this.form.valid["isPublic"];

        this.state = "LOADING";
        this.updateCatalog
            .mutate({
                identifier: {
                    catalogSlug: this.data.identifier.catalogSlug
                },
                value: this.form.value
            })
            .subscribe(
                ({ data, errors }) => {
                    if (errors) {
                        console.error(errors);
                        this.state = "ERROR";
                        return;
                    }

                    this.state = "SUCCESS";
                    this.dialogRef.close(data.updateCatalog);
                },
                () => {
                    this.state = "ERROR";
                }
            );
    }

    public openConfirmDialog(): void {
        if (this.confirmDialogOpened === false) {
            this.dialog.open(ConfirmationDialogComponent, {
                data: "Changing the slug will break links you have to packages outside of datapm."
            });
            this.confirmDialogOpened = true;
        }
    }
}
