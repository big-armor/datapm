import { Component, Inject, OnInit, ViewChild } from "@angular/core";
import { FormGroup, FormControl, Validators } from "@angular/forms";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { PageState } from "src/app/models/page-state";
import { AddOrUpdateGroupToCatalogGQL, Group, MyGroupsGQL, Catalog, Permission } from "src/generated/graphql";
import { getEffectivePermissions } from "src/app/services/permissions.service";

enum ErrorType {
    GROUP_NOT_FOUND = "GROUP_NOT_FOUND",
    CANNOT_SET_CATALOG_CREATOR_PERMISSIONS = "CANNOT_SET_CATALOG_CREATOR_PERMISSIONS"
}

type Data = {
    group?: Group;
    catalog?: Catalog;
};

@Component({
    selector: "app-add-group-catalog",
    templateUrl: "./add-group-catalog-permissions.component.html",
    styleUrls: ["./add-group-catalog-permissions.component.scss"]
})
export class AddGroupCatalogPermissionsComponent implements OnInit {
    public form: FormGroup;
    public state: PageState = "INIT";
    public error: ErrorType | string = null;

    public groupControl: FormControl = new FormControl("");

    public permission: Permission;
    public packagePermission: Permission;

    public selectedGroupSlug: string;
    public groups: Group[] = [];

    public loading: boolean;

    public hasErrors = false;

    private effectivePermissions: Permission[];
    private effectivePackagePermissions: Permission[];

    public catalogNameControl: FormControl = new FormControl("", [
        Validators.required,
        Validators.pattern(/^[a-zA-Z]([a-zA-Z0-9\-]*[a-zA-Z0-9])?$/)
    ]);

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: Data,
        private addOrUpdateGroupToCatalog: AddOrUpdateGroupToCatalogGQL,
        private myGroups: MyGroupsGQL,
        private dialogRef: MatDialogRef<AddGroupCatalogPermissionsComponent>
    ) {
        this.updateSelectedPermission(Permission.VIEW);
        this.updateSelectedPackagePermission(Permission.VIEW);
    }

    public ngOnInit(): void {
        this.form = new FormGroup({
            group: this.groupControl,
            catalogSlug: this.catalogNameControl
        });

        if (this.data.group) {
            this.selectedGroupSlug = this.data.group.slug;
        }

        if (this.data.catalog)
            this.form.controls.catalogSlug.setValue(
                this.data.catalog.identifier.catalogSlug + "/" + this.data.catalog.identifier.catalogSlug
            );
        this.updateGroups();
    }

    public submit(event: any): void {
        event.preventDefault();

        if (!this.hasErrors) {
            this.submitForm();
        }
    }

    public updateSelectedPermission(permission: any): void {
        this.permission = permission;
        this.effectivePermissions = getEffectivePermissions(permission);
    }

    public updateSelectedPackagePermission(permission: any): void {
        this.packagePermission = permission;
        this.effectivePackagePermissions = getEffectivePermissions(permission);
    }

    public onLoadingStatusChange(value: boolean): void {
        this.loading = value;
    }

    private updateGroups(): void {
        this.myGroups.fetch().subscribe(
            ({ errors, data }) => {
                if (errors) {
                    this.state = "ERROR";

                    const firstErrorMessage = errors[0].message;
                    this.error = firstErrorMessage;

                    this.loading = false;
                    return;
                }
                this.loading = false;
                this.groups = data.myGroups;
                this.form.controls.group.setValue(this.selectedGroupSlug);
            },
            () => {
                this.state = "ERROR";
                this.loading = false;
            }
        );
    }

    private submitForm(): void {
        this.state = "LOADING";
        this.loading = true;

        this.addOrUpdateGroupToCatalog
            .mutate({
                groupSlug: this.form.value.group,
                catalogIdentifier: {
                    catalogSlug: this.form.value.catalogSlug
                },
                permissions: this.effectivePermissions,
                packagePermissions: this.effectivePackagePermissions
            })
            .subscribe(
                ({ errors }) => {
                    if (errors) {
                        this.state = "ERROR";

                        const firstErrorMessage = errors[0].message;
                        if (firstErrorMessage.includes("USER_NOT_FOUND")) {
                            this.error = ErrorType.GROUP_NOT_FOUND;
                        } else if (firstErrorMessage.includes("CANNOT_SET_CATALOG_CREATOR_PERMISSIONS")) {
                            this.error = ErrorType.CANNOT_SET_CATALOG_CREATOR_PERMISSIONS;
                        } else {
                            this.error = firstErrorMessage;
                        }

                        this.loading = false;
                        return;
                    }
                    this.loading = false;
                    this.dialogRef.close("SUCCESS");
                },
                () => {
                    this.state = "ERROR";
                    this.loading = false;
                }
            );
    }
}
