import { Component } from "@angular/core";
import { DeleteGroupGQL, Group, MyGroupsGQL, Permission } from "../../../../generated/graphql";
import { PageState } from "../../../../app/models/page-state";
import { MatDialog } from "@angular/material/dialog";
import { CreateGroupComponent } from "../../create-group/create-group.component";
import { getHighestPermission } from "src/app/services/permissions.service";
import { DeleteGroupComponent } from "../../delete-group/delete-group.component";



enum ErrorType {
    GROUP_NOT_FOUND = "GROUP_NOT_FOUND",
    CANNOT_SET_PACKAGE_CREATOR_PERMISSIONS = "CANNOT_SET_PACKAGE_CREATOR_PERMISSIONS"
}

@Component({
    selector: "app-user-groups",
    templateUrl: "./user-groups.component.html",
    styleUrls: ["./user-groups.component.scss"]
})
export class UserGroupsComponent {

    public state: PageState = "INIT";
    public error: ErrorType | string;

    public groups: Group[];

    public readonly COLUMNS = ["name", "permission", "action"];

    constructor(
        private myGroups:MyGroupsGQL,
        private deleteGroupGql:DeleteGroupGQL,
        private dialog: MatDialog
    ) {

    }

    private ngOnInit() {
        this.refreshGroups();
    }

    public createGroup():void {
        this.dialog
            .open(CreateGroupComponent)
            .afterClosed()
            .subscribe((data) => {
                if (data) {
                    this.refreshGroups();
                }
            });
    }

    public getHigestPermission = getHighestPermission;

    private refreshGroups(): void {

      this.myGroups.fetch()
        .subscribe(
            ({ errors, data }) => {
                if (errors) {
                    this.state = "ERROR";

                    const firstErrorMessage = errors[0].message;
                    this.error = firstErrorMessage;
                    

                    return;
                }
                this.groups = data?.myGroups ?? [];
                this.state = "SUCCESS";
            },
            () => {
                this.state = "ERROR";
            });

    }

    public hasManagerPermission(group:Group) {
        return group.myPermissions?.includes(Permission.MANAGE);
    }

    public deleteGroup(group:Group) {

        const dlgRef = this.dialog.open(DeleteGroupComponent, {
            data: {
                groupSlug: group.slug
            }
        });

        dlgRef.afterClosed().subscribe((confirmed: boolean) => {
            if (confirmed) {
                this.refreshGroups();
            }
        });
    }
}
