import { Component, Inject, OnInit } from "@angular/core";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { CreateCatalogGQL } from "src/generated/graphql";

type State = "INIT" | "LOADING" | "SUCCESS" | "ERROR";

@Component({
    selector: "app-create-catalog",
    templateUrl: "./create-catalog.component.html",
    styleUrls: ["./create-catalog.component.scss"]
})
export class CreateCatalogComponent implements OnInit {
    public form: FormGroup;
    state: State = "INIT";
    error = "";

    constructor(
        private dialogRef: MatDialogRef<CreateCatalogComponent>,
        private createCatalog: CreateCatalogGQL,
        @Inject(MAT_DIALOG_DATA) private data: { input: string }
    ) {
        this.form = new FormGroup({
            displayName: new FormControl(data?.input, {
                validators: [Validators.required]
            }),
            description: new FormControl(""),
            website: new FormControl(""),
            isPublic: new FormControl(false)
        });
    }

    ngOnInit(): void {}

    submit() {
        if (this.state === "LOADING") {
            return;
        }

        this.state = "LOADING";
        const catalogSlug = this.form.value.displayName.toLowerCase().replace(/\s+/g, "-");
        this.createCatalog
            .mutate({
                value: {
                    ...this.form.value,
                    slug: catalogSlug
                }
            })
            .subscribe(
                (response) => {
                    if (response.errors) {
                        const error = response.errors.find((e) => e.message === "COLLECTION_SLUG_NOT_AVAILABLE");
                        if (error) {
                            this.error = `Catalog slug '${catalogSlug}' already exists. Please change name to fix the issue`;
                        } else {
                            this.error = "Unknown error occured";
                        }
                        this.state = "ERROR";
                        return;
                    }

                    this.dialogRef.close(this.form.value);
                },
                () => {
                    this.state = "ERROR";
                    this.error = "Unknown error occured";
                }
            );
    }
}
