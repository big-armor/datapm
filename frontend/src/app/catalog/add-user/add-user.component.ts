import { Component, Inject, OnInit } from "@angular/core";
import { FormGroup, FormControl, Validators } from "@angular/forms";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { PageState } from "src/app/models/page-state";
import { Permission, SetUserCatalogPermissionGQL } from "src/generated/graphql";

@Component({
    selector: "app-add-user",
    templateUrl: "./add-user.component.html",
    styleUrls: ["./add-user.component.scss"]
})
export class AddUserComponent implements OnInit {
    public form: FormGroup;
    public state: PageState = "INIT";

    constructor(
        private setUserCatalogPermissionGQL: SetUserCatalogPermissionGQL,
        private dialogRef: MatDialogRef<AddUserComponent>,
        @Inject(MAT_DIALOG_DATA) private catalogSlug: string
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
        this.setUserCatalogPermissionGQL
            .mutate({
                identifier: {
                    catalogSlug: this.catalogSlug
                },
                value: {
                    permission: [Permission.VIEW],
                    username: this.form.value.username
                }
            })
            .subscribe(
                () => {
                    this.dialogRef.close("SUCCESS");
                },
                () => {
                    this.state = "ERROR";
                }
            );
    }
}
