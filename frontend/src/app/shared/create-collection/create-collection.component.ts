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
                    if (response.errors) {
                        const error = response.errors.find((e) => e.message === "COLLECTION_SLUG_NOT_AVAILABLE");
                        if (error) {
                            this.error = `Collection slug '${collectionSlug}' already exists. Please change name to fix the issue`;
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
