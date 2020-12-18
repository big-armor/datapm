import { Component, Inject, OnInit } from "@angular/core";
import { FormGroup, FormControl, Validators } from "@angular/forms";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { PageState } from "src/app/models/page-state";
import { AddPackageToCollectionGQL } from "src/generated/graphql";

@Component({
    selector: "app-add-package",
    templateUrl: "./add-package.component.html",
    styleUrls: ["./add-package.component.scss"]
})
export class AddPackageComponent implements OnInit {
    public form: FormGroup;
    public state: PageState = "INIT";

    constructor(
        private addPackageToCollectionGQL: AddPackageToCollectionGQL,
        private dialogRef: MatDialogRef<AddPackageComponent>,
        @Inject(MAT_DIALOG_DATA) private collectionSlug: string
    ) {}

    ngOnInit(): void {
        this.form = new FormGroup({
            packageSlug: new FormControl("", [
                Validators.required,
                Validators.pattern(/^[a-zA-Z]([a-zA-Z0-9\-]*[a-zA-Z0-9])?\/[a-zA-Z]([a-zA-Z0-9\-]*[a-zA-Z0-9])?$/)
            ])
        });
    }

    submit(ev) {
        ev.preventDefault();

        if (!this.form.valid) {
            return;
        }

        const [catalogSlug, packageSlug] = this.form.value.packageSlug.split("/");

        this.state = "LOADING";
        this.addPackageToCollectionGQL
            .mutate({
                collectionIdentifier: {
                    collectionSlug: this.collectionSlug
                },
                packageIdentifier: {
                    catalogSlug,
                    packageSlug
                }
            })
            .subscribe(
                ({ data }) => {
                    this.dialogRef.close(data.addPackageToCollection);
                },
                () => {
                    this.state = "ERROR";
                }
            );
    }
}
