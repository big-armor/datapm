import { Component, Inject, OnInit } from "@angular/core";
import { FormGroup, FormControl, Validators } from "@angular/forms";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { PageState } from "src/app/models/page-state";
import { Permission, SetUserCollectionPermissionsGQL } from "src/generated/graphql";

enum ErrorType {
    USER_NOT_FOUND = "USER_NOT_FOUND",
    CANNOT_SET_COLLECTION_CREATOR_PERMISSIONS = "CANNOT_SET_COLLECTION_CREATOR_PERMISSIONS"
}
@Component({
    selector: "app-add-user",
    templateUrl: "./add-user.component.html",
    styleUrls: ["./add-user.component.scss"]
})
export class AddUserComponent implements OnInit {
    public form: FormGroup;
    public state: PageState = "INIT";
    public error: ErrorType = null;

    constructor(
        private setUserCollectionPermissionsGQL: SetUserCollectionPermissionsGQL,
        private dialogRef: MatDialogRef<AddUserComponent>,
        @Inject(MAT_DIALOG_DATA) private collectionSlug: string
    ) {}

    ngOnInit(): void {
        this.form = new FormGroup({
            username: new FormControl("", [Validators.required])
        });
    }

    submit(ev) {
        ev.preventDefault();

        if (!this.form.valid) {
            return;
        }

        this.state = "LOADING";
        this.setUserCollectionPermissionsGQL
            .mutate({
                identifier: {
                    collectionSlug: this.collectionSlug
                },
                value: {
                    permissions: [Permission.VIEW],
                    username: this.form.value.username
                }
            })
            .subscribe(
                ({ errors, data }) => {
                    if (errors) {
                        this.state = "ERROR";

                        if (errors[0].message.includes("USER_NOT_FOUND")) this.error = ErrorType.USER_NOT_FOUND;
                        else if (errors[0].message.includes("CANNOT_SET_COLLECTION_CREATOR_PERMISSIONS"))
                            this.error = ErrorType.CANNOT_SET_COLLECTION_CREATOR_PERMISSIONS;
                        else this.error = null;
                        return;
                    }
                    this.dialogRef.close("SUCCESS");
                },
                () => {
                    this.state = "ERROR";
                }
            );
    }
}
