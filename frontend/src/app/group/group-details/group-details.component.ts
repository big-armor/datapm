import { Component, OnDestroy } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { ActivatedRoute, NavigationExtras, ParamMap, Router } from "@angular/router";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { PageState } from "src/app/models/page-state";
import { AuthenticationService } from "src/app/services/authentication.service";
import { EditGroupComponent } from "src/app/shared/edit-group/edit-group.component";
import { Group, GroupGQL, Follow, Permission, RemoveGroupFromPackageGQL, CurrentUser } from "src/generated/graphql";

type GroupDetailsPageState = PageState | "NOT_AUTHORIZED" | "NOT_FOUND";

@Component({
    selector: "app-group-details",
    templateUrl: "./group-details.component.html",
    styleUrls: ["./group-details.component.scss"]
})
export class GroupDetailsComponent implements OnDestroy {
    public Permission: typeof Permission = Permission;

    public groupSlug: string = "";
    public group: Group;
    public state: GroupDetailsPageState = "INIT";
    public currentTab = 0;
    private unsubscribe$: Subject<any> = new Subject();

    public currentUser: CurrentUser;

    private tabs = ["", "packages", "catalogs", "collections"];

    public groupFollow: Follow;
    public followersCount: number;
    public isFollowing: boolean;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private groupGQL: GroupGQL,
        private dialog: MatDialog,
        private removeGroupPackage: RemoveGroupFromPackageGQL,
        private authenticationService: AuthenticationService
    ) {
        this.route.paramMap.pipe(takeUntil(this.unsubscribe$)).subscribe((paramMap: ParamMap) => {
            this.groupSlug = paramMap.get("groupSlug") || "";
            this.getGroupDetails();
        });

        this.authenticationService.currentUser.pipe(takeUntil(this.unsubscribe$)).subscribe((user: CurrentUser) => {
            this.currentUser = user;
        });
    }

    public ngOnDestroy(): void {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }

    public updateTabParam() {
        const tab = this.tabs[this.currentTab];
        const extras: NavigationExtras = {
            relativeTo: this.route,
            queryParamsHandling: "preserve"
        };

        if (tab !== "") {
            extras.fragment = tab;
        }

        this.router.navigate(["."], extras);
    }

    private getGroupDetails() {
        if (!this.groupSlug) {
            return;
        }

        this.state = "LOADING";
        this.groupGQL
            .fetch({
                groupSlug: this.groupSlug
            })
            .subscribe(
                ({ errors, data }) => {
                    if (errors) {
                        if (errors.find((e) => e.message.includes("NOT_AUTHORIZED"))) this.state = "NOT_AUTHORIZED";
                        if (errors.find((e) => e.message.includes("GROUP_NOT_FOUND"))) this.state = "NOT_FOUND";
                        else this.state = "ERROR";
                        return;
                    }
                    this.group = data.group as Group;
                    if (this.group.myPermissions.includes(Permission.MANAGE)) {
                        this.tabs.push("manage");
                    }

                    this.route.fragment.pipe(takeUntil(this.unsubscribe$)).subscribe((fragment: string) => {
                        const index = this.tabs.findIndex((tab) => tab === fragment);
                        if (index < 0) {
                            this.currentTab = 0;
                            this.updateTabParam();
                        } else {
                            this.currentTab = index;
                            this.updateTabParam();
                        }
                    });
                    this.state = "SUCCESS";
                },
                () => {
                    this.state = "ERROR";
                }
            );
    }

    public groupEdited(group: Group) {
        this.getGroupDetails();
    }

    editGroup(): void {
        this.dialog
            .open(EditGroupComponent, {
                data: this.group
            })
            .afterClosed()
            .subscribe((newGroup: Group) => {
                this.setGroupVariables(newGroup);
            });
    }

    public setGroupVariables(group: Group) {
        this.group = group;
    }

    public get canManage() {
        return this.group && this.group.myPermissions?.includes(Permission.MANAGE);
    }

    public get canEdit() {
        return this.group && this.group.myPermissions?.includes(Permission.EDIT);
    }
}
