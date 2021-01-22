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
        @Inject(MAT_DIALOG_DATA) data: { input: string }
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
                    if (!response.errors) {
                        this.dialogRef.close(this.form.value);
                        return;
                    }

                    for (const error of response.errors) {
                        if (error.message.includes("CATALOG_SLUG_NOT_AVAILABLE")) {
                            this.error = `Catalog slug '${catalogSlug}' already exists. Please change name to fix the issue`;
                        } else if (error.message.includes("RESERVED_KEYWORD")) {
                            this.error = "The name you entered is a restricted keyword in the system";
                        }
                    }

                    if (!this.error) {
                        this.error = "Unknown error occurred. Please try again or contact support.";
                    }

                    this.state = "ERROR";
                },
                () => {
                    this.state = "ERROR";
                    this.error = "Unknown error occurred";
                }
            );
    }
}
