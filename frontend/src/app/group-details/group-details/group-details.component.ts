import { Component, Input, OnDestroy } from "@angular/core";
import { MatDialog, MatDialogRef } from "@angular/material/dialog";
import { ActivatedRoute, NavigationExtras, ParamMap, Router } from "@angular/router";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { PageState } from "src/app/models/page-state";
import { AuthenticationService } from "src/app/services/authentication.service";
import {
    FollowDialogComponent,
    FollowDialogResult
} from "src/app/shared/dialogs/follow-dialog/follow-dialog.component";
import { ShareDialogComponent } from "src/app/shared/dialogs/share-dialog/share-dialog.component";
import { EditGroupComponent } from "src/app/shared/edit-group/edit-group.component";
import { LoginDialogComponent } from "src/app/shared/header/login-dialog/login-dialog.component";
import {
    Group,
    GroupGQL,
    Follow,
    FollowIdentifierInput,
    GetFollowGQL,
    Package,
    Permission,
    User
} from "src/generated/graphql";
import { AddPackageComponent } from "../add-package/add-package.component";

type GroupDetailsPageState = PageState | "NOT_AUTHORIZED" | "NOT_FOUND";

@Component({
    selector: "app-group-details",
    templateUrl: "./group-details.component.html",
    styleUrls: ["./group-details.component.scss"]
})
export class GroupDetailsComponent implements OnDestroy {
    public groupSlug: string = "";
    public group: Group;
    public state: GroupDetailsPageState = "INIT";
    public currentTab = 0;
    private unsubscribe$: Subject<any> = new Subject();

    public currentUser: User;

    private tabs = ["", "followers"];

    public groupFollow: Follow;
    public followersCount: number;
    public isFollowing: boolean;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private groupGQL: GroupGQL,
        private dialog: MatDialog,
        private getFollowGQL: GetFollowGQL,
        private authenticationService: AuthenticationService
    ) {
        this.route.paramMap.pipe(takeUntil(this.unsubscribe$)).subscribe((paramMap: ParamMap) => {
            this.groupSlug = paramMap.get("groupSlug") || "";
            this.getGroupDetails();
        });

        this.authenticationService.currentUser.pipe(takeUntil(this.unsubscribe$)).subscribe((user: User) => {
            this.currentUser = user;
        });
    }

    public ngOnDestroy(): void {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }

    public createFollow() {
        const dlgRef = this.dialog.open(FollowDialogComponent, {
            width: "500px"
        });
    }

    public sharePackage() {
        const dialogRef = this.dialog.open(ShareDialogComponent, {
            data: {
                displayName: this.group.name,
                url: "groups/" + this.group.identifier.groupSlug
            },
            width: "450px"
        });
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
                identifier: {
                    groupSlug: this.groupSlug
                }
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
                    this.loadFollowersCount();
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
                    this.getFollow();
                },
                () => {
                    this.state = "ERROR";
                }
            );
    }

    public groupEdited(group: Group) {
        this.getGroupDetails();
    }

    public addPackage() {
        const dialogRef = this.dialog.open(AddPackageComponent, {
            data: {
                group: this.group
            },
            width: "600px"
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (result) {
                this.getGroupDetails();
            }
        });
    }

    public removePackage(p: Package) {
        this.removePackageFromGroupGQL
            .mutate({
                groupIdentifier: {
                    groupSlug: this.groupSlug
                },
                packageIdentifier: {
                    catalogSlug: p.identifier.catalogSlug,
                    packageSlug: p.identifier.packageSlug
                }
            })
            .subscribe(() => {
                this.getGroupDetails();
            });
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

    public follow(): void {
        const followDialogRef = this.openFollowModal();
        if (followDialogRef) {
            followDialogRef.afterClosed().subscribe((result) => {
                if (!result) {
                    return;
                }

                this.updatePackageFollow(result.follow);
            });
        }
    }

    private loadFollowersCount(): void {
        const variables = {
            identifier: {
                groupSlug: this.group.identifier.groupSlug
            }
        };

        this.groupFollowersCountGQL.fetch(variables).subscribe((countResponse) => {
            if (countResponse.error) {
                return;
            }

            const responseData = countResponse.data;
            this.followersCount = responseData.groupFollowersCount;
        });
    }

    private getFollow(): void {
        if (!this.currentUser) {
            return;
        }

        this.getFollowGQL
            .fetch({
                follow: this.buildFollowIdentifier()
            })
            .subscribe((response) => {
                this.updatePackageFollow(response.data?.getFollow);
                const shouldOpenFollowModal = this.route.snapshot.queryParamMap.get("following");

                if (shouldOpenFollowModal) {
                    if (!this.isFollowing) {
                        this.follow();
                    }
                    this.router.navigate([], { preserveFragment: true });
                }
            });
    }

    private buildFollowIdentifier(): FollowIdentifierInput {
        return {
            group: {
                groupSlug: this.groupSlug
            }
        };
    }

    private openFollowModal(): MatDialogRef<FollowDialogComponent, FollowDialogResult> {
        if (!this.currentUser) {
            this.openLoginDialog();
        } else {
            return this.openFollowDialog();
        }
    }

    private updatePackageFollow(follow: Follow): void {
        this.groupFollow = follow;
        this.isFollowing = follow != null;
    }

    private openFollowDialog(): MatDialogRef<FollowDialogComponent, FollowDialogResult> {
        return this.dialog.open(FollowDialogComponent, {
            width: "500px",
            data: {
                follow: this.groupFollow,
                followIdentifier: this.buildFollowIdentifier()
            }
        });
    }

    private openLoginDialog(): void {
        this.router.navigate([], { queryParams: { following: true }, preserveFragment: true });
        this.dialog
            .open(LoginDialogComponent, {
                disableClose: true
            })
            .afterClosed()
            .subscribe(() => this.router.navigate([], { preserveFragment: true }));
    }
}
