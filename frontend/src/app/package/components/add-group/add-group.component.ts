import { Component, Inject, OnInit, ViewChild } from "@angular/core";
import { FormGroup, FormControl } from "@angular/forms";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { PageState } from "src/app/models/page-state";
import { AddOrUpdateGroupToPackageGQL, Group, MyGroupsGQL, Package, Permission } from "src/generated/graphql";
import { getEffectivePermissions } from "src/app/services/permissions.service";

enum ErrorType {
    GROUP_NOT_FOUND = "GROUP_NOT_FOUND",
    CANNOT_SET_PACKAGE_CREATOR_PERMISSIONS = "CANNOT_SET_PACKAGE_CREATOR_PERMISSIONS"
}

@Component({
  selector: 'app-add-group',
  templateUrl: './add-group.component.html',
  styleUrls: ['./add-group.component.scss']
})
export class AddGroupComponent implements OnInit {

    public form: FormGroup;
    public state: PageState = "INIT";
    public error: ErrorType | string = null;

    public groupControl: FormControl = new FormControl("");

    public permission: Permission;

    public selectedGroupSlug:string;
    public groups:Group[] = [];

    public loading: boolean;

    public hasErrors = false;

    private effectivePermissions: Permission[];

    constructor(
        @Inject(MAT_DIALOG_DATA) public userPackage: Package,
        private addOrUpdateGroupToPackage: AddOrUpdateGroupToPackageGQL,
        private myGroups:MyGroupsGQL,
        private dialogRef: MatDialogRef<AddGroupComponent>
    ) {
        this.updateSelectedPermission(Permission.VIEW);
    }

    public ngOnInit(): void {
        this.form = new FormGroup({
            group: this.groupControl
        });

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

      this.myGroups.fetch()
        .subscribe(
            ({ errors,data }) => {
                if (errors) {
                    this.state = "ERROR";

                    const firstErrorMessage = errors[0].message;
                    this.error = firstErrorMessage;
                    

                    this.loading = false;
                    return;
                }
                this.loading = false;
                this.groups = data.myGroups;
            },
            () => {
                this.state = "ERROR";
                this.loading = false;
            });

    }

    private submitForm(): void {

        this.state = "LOADING";
        this.loading = true;
        this.addOrUpdateGroupToPackage
            .mutate({
                groupSlug: this.selectedGroupSlug,
                packageIdentifier: {
                    catalogSlug: this.userPackage.identifier.catalogSlug,
                    packageSlug: this.userPackage.identifier.packageSlug
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
