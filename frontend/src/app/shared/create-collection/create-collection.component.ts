import { Component, Inject, OnInit } from "@angular/core";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { CreateCollectionGQL, SetCollectionCoverImageGQL } from "src/generated/graphql";
import { Observable, of } from "rxjs";

type State = "INIT" | "LOADING" | "SUCCESS" | "ERROR";

@Component({
    selector: "app-create-collection",
    templateUrl: "./create-collection.component.html",
    styleUrls: ["./create-collection.component.scss"]
})
export class CreateCollectionComponent {
    public form: FormGroup;
    public state: State = "INIT";
    public error = "";

    public coverImgData: string;

    public isPublicControl = new FormControl(false);

    constructor(
        private dialogRef: MatDialogRef<CreateCollectionComponent>,
        private createCollectionGQL: CreateCollectionGQL,
        private setCollectionCoverImageGQL: SetCollectionCoverImageGQL,
        @Inject(MAT_DIALOG_DATA) data: { input: string }
    ) {
        this.form = new FormGroup({
            name: new FormControl(data?.input, {
                validators: [Validators.required]
            }),
            description: new FormControl(""),
            isPublic: this.isPublicControl
        });
    }

    public submit(): void {
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
                        this.uploadCover(collectionSlug).subscribe(() =>
                            this.dialogRef.close(response.data.createCollection)
                        );
                        return;
                    }

                    for (const error of response.errors) {
                        if (error.message.includes("COLLECTION_SLUG_NOT_AVAILABLE")) {
                            this.error = `Catalog slug '${collectionSlug}' already exists. Please change name to fix the issue`;
                        } else if (error.message.includes("RESERVED_KEYWORD")) {
                            this.error = "The name you entered is a restricted keyword. Please choose another name";
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

    public addCoverImage(imgData: any): void {
        this.coverImgData = imgData;
    }

    private uploadCover(collectionSlug: string): Observable<any> {
        if (!this.coverImgData) {
            return of(null);
        }

        return this.setCollectionCoverImageGQL.mutate({
            identifier: {
                collectionSlug
            },
            image: {
                base64: this.coverImgData
            }
        });
    }
}
