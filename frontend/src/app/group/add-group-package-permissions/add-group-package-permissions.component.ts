import { Component, Inject, OnInit, ViewChild } from "@angular/core";
import { FormGroup, FormControl, Validators } from "@angular/forms";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { PageState } from "src/app/models/page-state";
import {
    AddOrUpdateGroupToPackageGQL,
    Group,
    MyGroupsGQL,
    Package,
    PackageIdentifierInput,
    Permission
} from "src/generated/graphql";
import { getEffectivePermissions } from "src/app/services/permissions.service";

enum ErrorType {
    GROUP_NOT_FOUND = "GROUP_NOT_FOUND",
    CANNOT_SET_PACKAGE_CREATOR_PERMISSIONS = "CANNOT_SET_PACKAGE_CREATOR_PERMISSIONS"
}

type Data = {
    group?: Group;
    package?: Package;
};

@Component({
    selector: "app-add-group-package",
    templateUrl: "./add-group-package-permissions.component.html",
    styleUrls: ["./add-group-package-permissions.component.scss"]
})
export class AddGroupPackagePermissionsComponent implements OnInit {
    public form: FormGroup;
    public state: PageState = "INIT";
    public error: ErrorType | string = null;

    public groupControl: FormControl = new FormControl("");

    public permission: Permission;

    public selectedGroupSlug: string;
    public groups: Group[] = [];

    public loading: boolean;

    public hasErrors = false;

    private effectivePermissions: Permission[];

    public packageNameControl: FormControl = new FormControl("", [
        Validators.required,
        Validators.pattern(/^[a-zA-Z]([a-zA-Z0-9\-]*[a-zA-Z0-9])?\/[a-zA-Z]([a-zA-Z0-9\-]*[a-zA-Z0-9])?$/)
    ]);

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: Data,
        private addOrUpdateGroupToPackage: AddOrUpdateGroupToPackageGQL,
        private myGroups: MyGroupsGQL,
        private dialogRef: MatDialogRef<AddGroupPackagePermissionsComponent>
    ) {
        this.updateSelectedPermission(Permission.VIEW);
    }

    public ngOnInit(): void {
        this.form = new FormGroup({
            group: this.groupControl,
            packageSlug: this.packageNameControl
        });

        if (this.data.group) {
            this.selectedGroupSlug = this.data.group.slug;
        }

        if (this.data.package)
            this.form.controls.packageSlug.setValue(
                this.data.package.identifier.catalogSlug + "/" + this.data.package.identifier.packageSlug
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

        const packageIdentifierParts = this.form.value.packageSlug.split("/");

        this.addOrUpdateGroupToPackage
            .mutate({
                groupSlug: this.form.value.group,
                packageIdentifier: {
                    catalogSlug: packageIdentifierParts[0],
                    packageSlug: packageIdentifierParts[1]
                },
                permissions: this.effectivePermissions
            })
            .subscribe(
                ({ errors }) => {
                    if (errors) {
                        this.state = "ERROR";

                        const firstErrorMessage = errors[0].message;
                        if (firstErrorMessage.includes("USER_NOT_FOUND")) {
                            this.error = ErrorType.GROUP_NOT_FOUND;
                        } else if (firstErrorMessage.includes("CANNOT_SET_PACKAGE_CREATOR_PERMISSIONS")) {
                            this.error = ErrorType.CANNOT_SET_PACKAGE_CREATOR_PERMISSIONS;
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
