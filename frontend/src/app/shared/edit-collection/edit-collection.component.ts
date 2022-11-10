import { Component, Inject } from "@angular/core";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { collectionSlugValidator } from "src/app/helpers/validators";
import { PageState } from "src/app/models/page-state";
import { Collection, Permission, SetCollectionCoverImageGQL, UpdateCollectionGQL } from "src/generated/graphql";
import { ConfirmationDialogComponent } from "../confirmation-dialog/confirmation-dialog.component";
import { ImageService } from "../../services/image.service";

@Component({
    selector: "app-edit-collection",
    templateUrl: "./edit-collection.component.html",
    styleUrls: ["./edit-collection.component.scss"]
})
export class EditCollectionComponent {
    public readonly errorMsg = {
        name: {
            required: "Collection name is required"
        },
        newCollectionSlug: {
            REQUIRED: "Collection slug is required",
            INVALID_CHARACTERS:
                "Collection slug must contain only numbers, letters, hyphens, and may not start or end with a hyphen.",
            TOO_LONG: "Collection slug must be less than 40 characters long.",
            NOT_AVAILABLE: "That collection slug is not available."
        }
    };
    form: FormGroup;
    confirmDialogOpened: boolean = false;
    state: PageState = "INIT";

    Permission = Permission;
    public isPublicControl = new FormControl(false);

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: Collection,
        private dialog: MatDialog,
        private dialogRef: MatDialogRef<EditCollectionComponent>,
        private setCollectionCoverImage: SetCollectionCoverImageGQL,
        private updateCollection: UpdateCollectionGQL,
        private imageService: ImageService
    ) {
        this.form = new FormGroup({
            isPublic: this.isPublicControl,
            name: new FormControl(data.name, {
                validators: [Validators.required]
            }),
            newCollectionSlug: new FormControl(data.identifier.collectionSlug, {
                asyncValidators: [collectionSlugValidator()]
            }),
            description: new FormControl(data.description)
        });

        this.isPublicControl.setValue(this.data.isPublic);
    }

    public uploadCover(data: any): void {
        this.setCollectionCoverImage
            .mutate({
                image: { base64: data },
                identifier: {
                    collectionSlug: this.data.identifier.collectionSlug
                }
            })
            .subscribe(() => this.imageService.loadCollectionCover(this.data.identifier.collectionSlug, true));
    }

    public save(): void {
        if (!this.form.valid) {
            return;
        }

        if (!this.data.myPermissions.includes(Permission.MANAGE)) delete this.form.valid["isPublic"];

        this.state = "LOADING";
        this.updateCollection
            .mutate({
                identifier: {
                    collectionSlug: this.data.identifier.collectionSlug
                },
                value: this.form.value
            })
            .subscribe(
                ({ data }) => {
                    this.state = "SUCCESS";
                    this.dialogRef.close(data.updateCollection);
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
