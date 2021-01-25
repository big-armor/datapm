import { Component, Inject } from "@angular/core";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { CreateCatalogGQL, SetCatalogAvatarImageGQL, SetCatalogCoverImageGQL } from "src/generated/graphql";
import { ImageService } from "../../services/image.service";
import { combineLatest, merge, Observable, of } from "rxjs";

type State = "INIT" | "LOADING" | "SUCCESS" | "ERROR";

@Component({
    selector: "app-create-catalog",
    templateUrl: "./create-catalog.component.html",
    styleUrls: ["./create-catalog.component.scss"]
})
export class CreateCatalogComponent {
    public form: FormGroup;
    public state: State = "INIT";
    public error = "";

    public avatarImgData: string;
    public coverImgData: string;

    constructor(
        private dialogRef: MatDialogRef<CreateCatalogComponent>,
        private createCatalog: CreateCatalogGQL,
        private setCatalogAvatarImageGQL: SetCatalogAvatarImageGQL,
        private setCatalogCoverImage: SetCatalogCoverImageGQL,
        private imageService: ImageService,
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

    public submit(): void {
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
                        this.uploadImages(catalogSlug).subscribe(() => this.dialogRef.close(this.form.value));
                        return;
                    }

                    for (const error of response.errors) {
                        if (error.message.includes("CATALOG_SLUG_NOT_AVAILABLE")) {
                            this.error = `Catalog slug '${catalogSlug}' already exists. Please change name to fix the issue`;
                        } else if (error.message.includes("RESERVED_KEYWORD")) {
                            this.error = "The name you entered is a restricted keyword. Please choose another name";
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

    public addAvatarImage(imgData: any): void {
        this.avatarImgData = imgData;
    }

    public addCoverImage(imgData: any): void {
        this.coverImgData = imgData;
    }

    private uploadImages(catalogSlug: string): Observable<any> {
        return combineLatest([this.uploadAvatar(catalogSlug), this.uploadCover(catalogSlug)]);
    }

    private uploadAvatar(catalogSlug: string): Observable<any> {
        if (!this.avatarImgData) {
            return of(null);
        }

        return this.setCatalogAvatarImageGQL.mutate({
            identifier: {
                catalogSlug
            },
            image: {
                base64: this.avatarImgData
            }
        });
    }

    private uploadCover(catalogSlug: string): Observable<any> {
        if (!this.coverImgData) {
            return of(null);
        }

        return this.setCatalogCoverImage.mutate({
            identifier: {
                catalogSlug
            },
            image: {
                base64: this.coverImgData
            }
        });
    }
}
