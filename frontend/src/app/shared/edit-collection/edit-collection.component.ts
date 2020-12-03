import { Component, Inject, OnInit } from "@angular/core";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { slugValidator } from "src/app/helpers/validators";
import { PageState } from "src/app/models/page-state";
import { Collection, SetCollectionCoverImageGQL, UpdateCollectionGQL } from "src/generated/graphql";
import { ConfirmationDialogComponent } from "../confirmation-dialog/confirmation-dialog.component";

@Component({
    selector: "app-edit-collection",
    templateUrl: "./edit-collection.component.html",
    styleUrls: ["./edit-collection.component.scss"]
})
export class EditCollectionComponent implements OnInit {
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

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: Collection,
        private dialog: MatDialog,
        private dialogRef: MatDialogRef<EditCollectionComponent>,
        private setCollectionCoverImage: SetCollectionCoverImageGQL,
        private updateCollection: UpdateCollectionGQL
    ) {
        this.form = new FormGroup({
            isPublic: new FormControl(data.isPublic),
            name: new FormControl(data.name, {
                validators: [Validators.required]
            }),
            newCollectionSlug: new FormControl(data.identifier.collectionSlug, {
                asyncValidators: [slugValidator()]
            })
        });
    }

    ngOnInit(): void {}

    uploadCover(data: any) {
        this.setCollectionCoverImage
            .mutate({
                image: { base64: data },
                identifier: {
                    collectionSlug: this.data.identifier.collectionSlug
                }
            })
            .subscribe(() => {});
    }

    save() {
        if (!this.form.valid) {
            return;
        }

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

    openConfirmDialog() {
        if (this.confirmDialogOpened === false) {
            this.dialog.open(ConfirmationDialogComponent, {
                data: "Changing the slug will break links you have to packages outside of datapm."
            });
            this.confirmDialogOpened = true;
        }
    }
}
