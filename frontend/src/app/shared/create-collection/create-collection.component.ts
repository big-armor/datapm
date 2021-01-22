import { Component, Inject, OnInit } from "@angular/core";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { CreateCollectionGQL } from "src/generated/graphql";

type State = "INIT" | "LOADING" | "SUCCESS" | "ERROR";

@Component({
    selector: "app-create-collection",
    templateUrl: "./create-collection.component.html",
    styleUrls: ["./create-collection.component.scss"]
})
export class CreateCollectionComponent implements OnInit {
    public form: FormGroup;
    state: State = "INIT";
    error = "";

    constructor(
        private dialogRef: MatDialogRef<CreateCollectionComponent>,
        private createCollectionGQL: CreateCollectionGQL,
        @Inject(MAT_DIALOG_DATA) data: { input: string }
    ) {
        this.form = new FormGroup({
            name: new FormControl(data?.input, {
                validators: [Validators.required]
            }),
            description: new FormControl("")
        });
    }

    ngOnInit(): void {}

    submit() {
        if (this.state === "LOADING") {
            return;
        }

        this.state = "LOADING";
        const collectionSlug = this.form.value.name.toLowerCase().replace(/\s+/g, "-");
        this.createCollectionGQL
            .mutate({
                value: {
                    ...this.form.value,
                    collectionSlug
                }
            })
            .subscribe(
                (response) => {
                    if (!response.errors) {
                        this.dialogRef.close(this.form.value);
                        return;
                    }

                    for (const error of response.errors) {
                        if (error.message.includes("COLLECTION_SLUG_NOT_AVAILABLE")) {
                            this.error = `Catalog slug '${collectionSlug}' already exists. Please change name to fix the issue`;
                        } else if (error.message.includes("RESERVED_KEYWORD")) {
                            this.error = "The name you entered is a restricted keyword in the system";
                        }
                    }

                    if (!this.error) {
                        this.error = "Unknown error occurred. Please try again or contact support.";
                    }

                    this.state = "ERROR";
                },
                (response) => {
                    this.state = "ERROR";

                    if (response.networkError?.error.errors) {
                        if (
                            response.networkError?.error.errors.find((e) =>
                                e.extensions?.exception?.stacktrace[0].includes("COLLECTION_SLUG_INVALID")
                            )
                        )
                            this.error = "Only characters a-z, A-Z, 0-9, and - are supported for collection names";
                    } else this.error = "Unknown error occured. Please try again or contact support";
                }
            );
    }
}
