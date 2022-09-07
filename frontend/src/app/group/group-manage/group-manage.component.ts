import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { Router } from "@angular/router";
import { AuthenticationService } from "src/app/services/authentication.service";
import { DeleteGroupComponent } from "src/app/shared/delete-group/delete-group.component";
import { EditGroupComponent } from "src/app/shared/edit-group/edit-group.component";
import { Group, Permission } from "src/generated/graphql";

@Component({
    selector: "app-group-manage",
    templateUrl: "./group-manage.component.html",
    styleUrls: ["./group-manage.component.scss"]
})
export class GroupManageComponent implements OnChanges {
    @Input() group: Group;
    @Output() groupEdited: EventEmitter<Group> = new EventEmitter();

    Permission = Permission;

    public columnsToDisplay = ["name", "permission", "actions"];
    public users: any[] = [];

    constructor(
        private dialog: MatDialog,
        private authenticationService: AuthenticationService,
        private router: Router
    ) {}

    ngOnChanges(changes: SimpleChanges) {
        if (changes.group && changes.group.currentValue) {
            this.group = changes.group.currentValue;
        }
    }

    public editGroup() {
        this.dialog
            .open(EditGroupComponent, {
                data: this.group,
                disableClose: true
            })
            .afterClosed()
            .subscribe((group: Group) => {
                this.group = group;
                this.groupEdited.emit(group);
            });
    }

    public deleteGroup() {
        const dlgRef = this.dialog.open(DeleteGroupComponent, {
            data: {
                groupSlug: this.group.slug
            }
        });

        dlgRef.afterClosed().subscribe((confirmed: boolean) => {
            if (confirmed)
                this.router.navigate(["/" + this.authenticationService.currentUser.getValue().user.username], {
                    fragment: "groups"
                });
        });
    }
}
