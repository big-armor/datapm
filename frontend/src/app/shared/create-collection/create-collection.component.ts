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
        @Inject(MAT_DIALOG_DATA) private data: { input: string }
    ) {
        this.form = new FormGroup({
            name: new FormControl(data?.input, {
                validators: [Validators.required]
            })
        });
    }

    ngOnInit(): void {}

    submit() {
        if (this.state === "LOADING") {
            return;
        }

        const name = this.form.value.name;
        this.state = "LOADING";
        this.createCollectionGQL
            .mutate({
                value: {
                    name,
                    collectionSlug: name.toLowerCase().replace(/\s+/g, "-")
                }
            })
            .subscribe(
                (response) => {
                    if (response.errors) {
                        const error = response.errors.find((e) => e.message === "COLLECTION_SLUG_NOT_AVAILABLE");
                        if (error) {
                            this.error = `Collection slug '${name.toLowerCase()}' already exists. Please change name to fix the issue`;
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
