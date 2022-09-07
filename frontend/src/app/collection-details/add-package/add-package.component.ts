import { Component, Inject, OnDestroy, OnInit } from "@angular/core";
import { FormGroup, FormControl, Validators } from "@angular/forms";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { Router } from "@angular/router";
import { Subject } from "rxjs";
import { debounceTime, filter, switchMap, takeUntil } from "rxjs/operators";
import { PageState } from "src/app/models/page-state";
import { AuthenticationService } from "src/app/services/authentication.service";
import { SnackBarService } from "src/app/services/snackBar.service";
import {
    AddPackageToCollectionGQL,
    Collection,
    CollectionSlugAvailableGQL,
    CreateCollectionGQL,
    PackageIdentifierInput,
    UserCollectionsGQL
} from "src/generated/graphql";

import { nameToSlug } from "datapm-lib";

enum ErrorType {
    PACKAGE_NOT_FOUND = "PACKAGE_NOT_FOUND",
    CATALOG_NOT_FOUND = "CATALOG_NOT_FOUND",
    COLLECTION_NOT_FOUND = "COLLECTION_NOT_FOUND"
}

class AddPackageToCollectionData {
    collection: Collection;
    packageIdentifier: PackageIdentifierInput;
}

@Component({
    selector: "app-add-package",
    templateUrl: "./add-package.component.html",
    styleUrls: ["./add-package.component.scss"]
})
export class AddPackageComponent implements OnInit, OnDestroy {
    private readonly COLLECTION_SEARCH_DELAY_IN_MS = 500;
    private readonly destroy$ = new Subject();

    public state: PageState = "INIT";
    public error: ErrorType = null;

    public collections: Collection[];

    public selectedCollection: Collection;
    public selectedCollectionName: string;

    public form: FormGroup;
    public packageNameControl: FormControl = new FormControl("", [
        Validators.required,
        Validators.pattern(/^[a-zA-Z]([a-zA-Z0-9\-]*[a-zA-Z0-9])?\/[a-zA-Z]([a-zA-Z0-9\-]*[a-zA-Z0-9])?$/)
    ]);
    public collectionNameControl: FormControl = new FormControl("", [Validators.required]);

    public selectedValidCollectionSlug = false;
    public searchCollectionsTimeout: NodeJS.Timeout;

    private userCollections: Collection[];

    constructor(
        private addPackageToCollectionGQL: AddPackageToCollectionGQL,
        private dialogRef: MatDialogRef<AddPackageComponent>,
        private userCollectionsGQL: UserCollectionsGQL,
        private collectionSlugAvailableGQL: CollectionSlugAvailableGQL,
        private createCollectionGQL: CreateCollectionGQL,
        private authenticationService: AuthenticationService,
        private snackBar: SnackBarService,
        private router: Router,
        @Inject(MAT_DIALOG_DATA) private data: AddPackageToCollectionData
    ) {}

    public ngOnInit(): void {
        this.form = new FormGroup({
            packageSlug: this.packageNameControl,
            collectionName: this.collectionNameControl
        });

        if (this.data.collection) {
            this.selectedCollection = this.data.collection;
            this.selectedCollectionName = this.selectedCollection.name;
            this.collectionNameControl.setValue(this.selectedCollection);
        }

        if (this.data.packageIdentifier)
            this.packageNameControl.setValue(
                this.data.packageIdentifier.catalogSlug + "/" + this.data.packageIdentifier.packageSlug
            );

        this.userCollectionsGQL
            .fetch({
                limit: 9999,
                offSet: 0,
                username: this.authenticationService.currentUser.getValue().user.username
            })
            .subscribe(({ errors, data }) => {
                if (errors) {
                    console.log(errors);
                    return;
                }

                this.userCollections = data.userCollections.collections;
                this.collections = this.userCollections;
                this.state = "SUCCESS";
            });

        this.listenToCollectionInput();
    }

    public ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    public submit(ev): void {
        ev.preventDefault();

        this.form.updateValueAndValidity();

        if (!this.form.valid) {
            return;
        }

        if (this.selectedCollection) {
            this.addPackageToCollection();
        } else if (!this.selectedCollection && this.selectedValidCollectionSlug) {
            this.createCollectionAndAddPackage();
        }
    }

    public get shouldShowCreatingNewCollectionLabel(): boolean {
        return (
            this.selectedCollection == null &&
            this.state != "ERROR" &&
            this.selectedCollectionName != null &&
            this.selectedCollectionName.trim().length > 0
        );
    }

    public displayCollection(collection: Collection): string {
        return collection.name;
    }

    public selectCollection(collection: Collection): void {
        this.selectedCollection = collection;
        this.selectedCollectionName = collection.name;
        this.selectedValidCollectionSlug = true;
    }

    private listenToCollectionInput(): void {
        this.collectionNameControl.valueChanges
            .pipe(
                takeUntil(this.destroy$),
                filter((searchValue) => searchValue.constructor.name == "String")
            )
            .subscribe((searchValue: string) => {
                this.selectedCollection = null;
                if (this.searchCollectionsTimeout) {
                    clearTimeout(this.searchCollectionsTimeout);
                }

                this.searchCollectionsTimeout = setTimeout(
                    () => this.searchCollections(searchValue),
                    this.COLLECTION_SEARCH_DELAY_IN_MS
                );
            });
    }

    private searchCollections(searchValue: string): void {
        this.selectedCollection = null;
        const collectionSlug = nameToSlug(searchValue);
        if (!searchValue) {
            this.collections = this.userCollections;
        } else {
            this.collections = this.userCollections.filter(
                (c) => c.name.includes(searchValue) || c.name.includes(searchValue)
            );
            if (!this.collections.length) {
                this.collectionSlugAvailableGQL.fetch({ collectionSlug }).subscribe((result) => {
                    this.selectedValidCollectionSlug = result.data?.collectionSlugAvailable;
                    this.selectedCollectionName = searchValue;
                });
            } else {
                this.selectedCollection = this.userCollections.find((c) => c.name === searchValue);
                this.selectedValidCollectionSlug = true;
            }
        }

        this.searchCollectionsTimeout = null;
    }

    private createCollectionAndAddPackage(): void {
        this.state = "LOADING";
        const collection = {
            collectionSlug: nameToSlug(this.selectedCollectionName),
            name: this.selectedCollectionName
        };

        this.createCollectionGQL.mutate({ value: collection }).subscribe((result) => {
            if (result.data.createCollection) {
                this.selectedCollection = result.data.createCollection;
                this.addPackageToCollection(true);
            } else if (result.errors) {
                this.state = "ERROR";
            }
        });
    }

    private addPackageToCollection(navigateToCollection = false): void {
        const [catalogSlug, packageSlug] = this.form.value.packageSlug.split("/");

        this.state = "LOADING";
        this.addPackageToCollectionGQL
            .mutate({
                collectionIdentifier: {
                    collectionSlug: this.selectedCollection.identifier.collectionSlug
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
                    this.snackBar.openSnackBar("Package added to collection " + this.selectedCollectionName, "ok");

                    if (navigateToCollection) {
                        this.router.navigate(["collection", this.selectedCollection.identifier.collectionSlug]);
                    }
                },
                () => {
                    this.state = "ERROR";
                }
            );
    }
}
