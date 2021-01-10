import { Component, Inject, OnInit } from "@angular/core";
import { FormGroup, FormControl, Validators } from "@angular/forms";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { debounceTime, switchMap } from "rxjs/operators";
import { PageState } from "src/app/models/page-state";
import { AuthenticationService } from "src/app/services/authentication.service";
import { SnackBarService } from "src/app/services/snackBar.service";
import {
    AddPackageToCollectionGQL,
    AutoCompletePackageGQL,
    AutoCompleteResult,
    Collection,
    CollectionIdentifier,
    CollectionIdentifierInput,
    MyCollectionsGQL,
    PackageIdentifierInput,
    UserCollectionsGQL
} from "src/generated/graphql";

enum ErrorType {
    PACKAGE_NOT_FOUND = "PACKAGE_NOT_FOUND",
    CATALOG_NOT_FOUND = "CATALOG_NOT_FOUND",
    COLLECTION_NOT_FOUND = "COLLECTION_NOT_FOUND"
}

class AddPackageToCollectionData {
    collectionIdentifier: CollectionIdentifierInput;
    packageIdentifier: PackageIdentifierInput;
}

@Component({
    selector: "app-add-package",
    templateUrl: "./add-package.component.html",
    styleUrls: ["./add-package.component.scss"]
})
export class AddPackageComponent implements OnInit {
    public form: FormGroup;
    public state: PageState = "INIT";
    public error: ErrorType = null;
    public collections: Collection[];
    public selectedCollectionSlug: string;

    public packageNameControl: FormControl = new FormControl("", [
        Validators.required,
        Validators.pattern(/^[a-zA-Z]([a-zA-Z0-9\-]*[a-zA-Z0-9])?\/[a-zA-Z]([a-zA-Z0-9\-]*[a-zA-Z0-9])?$/)
    ]);

    public collectionNameControl: FormControl = new FormControl(".*", [Validators.required]);

    autoCompleteResult: AutoCompleteResult;

    constructor(
        private addPackageToCollectionGQL: AddPackageToCollectionGQL,
        private dialogRef: MatDialogRef<AddPackageComponent>,
        private autoCompletePackages: AutoCompletePackageGQL,
        private userCollectionsGQL: UserCollectionsGQL,
        private authenticationService: AuthenticationService,
        private snackBar: SnackBarService,
        @Inject(MAT_DIALOG_DATA) private data: AddPackageToCollectionData
    ) {}

    ngOnInit(): void {
        this.form = new FormGroup({
            packageSlug: this.packageNameControl,
            collectionSlug: this.collectionNameControl
        });

        if (this.data.collectionIdentifier) this.selectedCollectionSlug = this.data.collectionIdentifier.collectionSlug;

        this.userCollectionsGQL
            .fetch({
                limit: 9999,
                offSet: 0,
                username: this.authenticationService.currentUser.getValue().username
            })
            .subscribe(({ errors, data }) => {
                if (errors) {
                    console.log(errors);
                    return;
                }

                this.collections = data.userCollections.collections;
            });

        this.packageNameControl.valueChanges
            .pipe(
                debounceTime(500),
                switchMap((value) => {
                    if (value.length < 2) {
                        this.autoCompleteResult = null;
                        return [];
                    }
                    return this.autoCompletePackages.fetch({ startsWith: value });
                })
            )
            .subscribe((result) => {
                if (result.errors != null) this.autoCompleteResult = null;
                else this.autoCompleteResult = result.data.autoComplete;
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
                    collectionSlug: this.selectedCollectionSlug
                },
                packageIdentifier: {
                    catalogSlug,
                    packageSlug
                }
            })
            .subscribe(
                ({ errors, data }) => {
                    if (errors) {
                        this.state = "ERROR";

                        if (errors[0].message.includes("PACKAGE_NOT_FOUND")) this.error = ErrorType.PACKAGE_NOT_FOUND;
                        else if (errors[0].message.includes("CATALOG_NOT_FOUND"))
                            this.error = ErrorType.CATALOG_NOT_FOUND;
                        else if (errors[0].message.includes("COLLECTION_NOT_FOUND"))
                            this.error = ErrorType.COLLECTION_NOT_FOUND;
                        else this.error = null;

                        return;
                    }
                    this.dialogRef.close(data.addPackageToCollection);
                    this.snackBar.openSnackBar("Package added to collection " + this.selectedCollectionSlug, "ok");
                },
                () => {
                    this.state = "ERROR";
                }
            );
    }
}
