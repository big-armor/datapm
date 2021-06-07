import { Component, Inject, OnDestroy, OnInit } from "@angular/core";
import { FormControl, Validators } from "@angular/forms";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { Router } from "@angular/router";
import { Subject } from "rxjs";
import { debounceTime, takeUntil } from "rxjs/operators";
import { AutoCompleteCatalogGQL, Catalog, MovePackageGQL, Package, Permission } from "src/generated/graphql";

export interface MovePackageDialogData {
    packageObject: Package;
    hasOtherUsers: boolean;
}

@Component({
    selector: "app-move-package",
    templateUrl: "./move-package.component.html",
    styleUrls: ["./move-package.component.scss"]
})
export class MovePackageComponent implements OnInit, OnDestroy {
    private readonly destroy$ = new Subject();
    private readonly VALIDATE_TIMEOUT_IN_MS = 300;

    public catalogDoesntExist: boolean = false;
    public isMissingCatalogEditPermissions: boolean = false;
    public packageWillBePrivateAfterMove: boolean = false;
    public hasOtherUsers: boolean = false;
    public sameCatalogSelected: boolean = false;

    public catalogControl = new FormControl([Validators.required]);

    public selectedCatalog: Catalog;
    public selectedCatalogPermission: string;
    public catalogs: Catalog[] = [];

    public catalogPermissionsCheckbox = false;
    public packageLinksCheckbox = false;
    public usersPermissionsCheckbox = false;

    public serverError: boolean = false;
    public submitting: boolean = false;

    private packageObject: Package;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: MovePackageDialogData,
        private dialogRef: MatDialogRef<MovePackageComponent>,
        private catalogAutoCompleteGQL: AutoCompleteCatalogGQL,
        private movePackageGQL: MovePackageGQL,
        private router: Router
    ) {
        this.packageObject = data.packageObject;
        this.hasOtherUsers = data.hasOtherUsers;

        this.usersPermissionsCheckbox = !this.hasOtherUsers;
    }

    public ngOnInit(): void {
        this.attachChangeEvents();
    }

    public ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    public selectCatalog(catalog: Catalog): void {
        if (catalog == null) {
            this.resetSelectedCatalog();
            return;
        } else if (catalog.identifier.catalogSlug === this.packageObject.identifier.catalogSlug) {
            this.sameCatalogSelected = true;
            return;
        }

        this.selectedCatalog = catalog;
        this.sameCatalogSelected = false;
        this.catalogDoesntExist = false;

        this.isMissingCatalogEditPermissions = !catalog.myPermissions.includes(Permission.EDIT);
        if (!this.isMissingCatalogEditPermissions) {
            this.selectedCatalogPermission = catalog.myPermissions[catalog.myPermissions.length - 1].toLowerCase();
        }

        this.packageWillBePrivateAfterMove = this.packageObject.isPublic && !catalog.isPublic;
    }

    public displayCatalog(catalog: Catalog): string {
        if (!catalog || !catalog.identifier) {
            return null;
        }

        return catalog.displayName + " (" + catalog.identifier.catalogSlug + ")";
    }

    public onFocusOut(): void {
        setTimeout(() => this.validateSelectedCatalog(), this.VALIDATE_TIMEOUT_IN_MS);
    }

    public canSubmit(): boolean {
        return (
            this.selectedCatalog &&
            !this.sameCatalogSelected &&
            !this.isMissingCatalogEditPermissions &&
            this.catalogPermissionsCheckbox &&
            this.packageLinksCheckbox &&
            this.usersPermissionsCheckbox &&
            !this.submitting
        );
    }

    public submit(): void {
        if (this.submitting) {
            return;
        }

        this.submitting = true;
        const packageIdentifier = this.packageObject.identifier;
        const targetCatalogSlug = this.selectedCatalog.identifier.catalogSlug;
        this.movePackageGQL
            .mutate({
                identifier: {
                    catalogSlug: packageIdentifier.catalogSlug,
                    packageSlug: packageIdentifier.packageSlug
                },
                catalogIdentifier: {
                    catalogSlug: targetCatalogSlug
                }
            })
            .subscribe(
                (response) => {
                    if (response.errors) {
                        console.error(response.errors);
                        this.serverError = true;
                        return;
                    }

                    this.router.navigate([targetCatalogSlug, packageIdentifier.packageSlug]);
                    this.close();
                },
                () => (this.serverError = true)
            );
    }

    public close(): void {
        this.dialogRef.close();
    }

    private attachChangeEvents(): void {
        this.catalogControl.valueChanges
            .pipe(debounceTime(this.VALIDATE_TIMEOUT_IN_MS), takeUntil(this.destroy$))
            .subscribe((value) => {
                if (typeof value == "string") {
                    this.serverError = false;
                    this.selectCatalog(null);
                    this.loadMatchingCatalogs(value);
                }
            });
    }

    private loadMatchingCatalogs(value: string): void {
        if (!this.shouldSearchOrValidate(value)) {
            this.catalogs = [];
            this.resetSelectedCatalog();
            this.catalogDoesntExist = false;
            return;
        }

        this.catalogAutoCompleteGQL.fetch({ startsWith: value }).subscribe((response) => {
            if (response.errors) {
                return;
            }

            this.catalogs = response.data.autoComplete.catalogs;
            if (this.catalogs.length === 0) {
                this.catalogDoesntExist = true;
            }
        });
    }

    private validateSelectedCatalog(): void {
        const inputValue = this.catalogControl.value;
        if (typeof inputValue != "string") {
            this.catalogDoesntExist = false;
            return;
        }

        if (!this.shouldSearchOrValidate(inputValue)) {
            this.catalogDoesntExist = false;
            this.sameCatalogSelected = false;
            return;
        }

        if (this.selectedCatalog != this.catalogControl.value) {
            const matchingCatalog = this.catalogs.find((c) => c.identifier.catalogSlug === inputValue);
            if (matchingCatalog) {
                this.selectCatalog(matchingCatalog);
            } else {
                this.catalogDoesntExist = true;
                this.selectCatalog(null);
            }
        }
    }

    private shouldSearchOrValidate(value: string): boolean {
        return value.length > 1;
    }

    private resetSelectedCatalog(): void {
        this.selectedCatalog = null;
        this.isMissingCatalogEditPermissions = false;
        this.selectedCatalogPermission = null;
        this.packageWillBePrivateAfterMove = false;
        this.sameCatalogSelected = false;
    }
}
