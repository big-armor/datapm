import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from "@angular/core";
import {
    Catalog,
    CatalogFollowersCountGQL,
    CatalogFollowersGQL,
    CurrentUser,
    Follow,
    FollowIdentifierInput,
    GetFollowGQL,
    Package,
    Permission,
    User
} from "src/generated/graphql";
import { ActivatedRoute, NavigationExtras, Router } from "@angular/router";
import { MatDialog, MatDialogRef } from "@angular/material/dialog";
import { EditCatalogComponent } from "src/app/shared/edit-catalog/edit-catalog.component";
import { PageState } from "src/app/models/page-state";
import { DialogService } from "../../services/dialog/dialog.service";
import { DeletePackageComponent } from "../../shared/delete-package/delete-package.component";
import { takeUntil } from "rxjs/operators";
import { Subject } from "rxjs";
import {
    FollowDialogComponent,
    FollowDialogData,
    FollowDialogResult
} from "src/app/shared/dialogs/follow-dialog/follow-dialog.component";
import { AuthenticationService } from "src/app/services/authentication.service";
import { LoginDialogComponent } from "src/app/shared/header/login-dialog/login-dialog.component";

@Component({
    selector: "app-catalog-details",
    templateUrl: "./catalog-details.component.html",
    styleUrls: ["./catalog-details.component.scss"]
})
export class CatalogDetailsComponent implements OnInit, OnDestroy {
    @Input()
    public catalog: Catalog;
    public state: PageState | "CATALOG_NOT_FOUND" | "NOT_AUTHENTICATED" = "INIT";
    public currentTab = 0;

    Permission = Permission;

    public currentUser: CurrentUser;

    public catalogFollow: Follow;
    public isFollowing: boolean;
    public followersCount: number;

    @Output()
    public onCatalogUpdate = new EventEmitter<Catalog>();

    private unsubscribe$: Subject<any> = new Subject();
    private tabs = ["", "followers"];

    private ignoreFragments = ["catalogs"];

    constructor(
        private dialog: MatDialog,
        private router: Router,
        private route: ActivatedRoute,
        private dialogService: DialogService,
        private getFollowGQL: GetFollowGQL,
        private catalogFollowersCountGQL: CatalogFollowersCountGQL,
        private authenticationService: AuthenticationService
    ) {}

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

    public ngOnInit(): void {
        this.authenticationService.currentUser
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((currentUser: CurrentUser) => {
                this.currentUser = currentUser;
            });
        if (this.canEdit) {
            this.tabs.push("manage");
        }

        this.route.fragment.pipe(takeUntil(this.unsubscribe$)).subscribe((fragment: string) => {
            const index = this.tabs.findIndex((tab) => tab === fragment);
            if (index < 0) {
                if (!this.ignoreFragments.includes(fragment)) {
                    this.currentTab = 0;
                    this.updateTabParam();
                }
            } else {
                this.currentTab = index;
                this.updateTabParam();
            }
        });

        this.state = "LOADING";
        this.getFollow();
        this.loadFollowersCount();
    }

    public ngOnDestroy(): void {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }

    public editCatalog(): void {
        this.dialog
            .open(EditCatalogComponent, {
                data: this.catalog
            })
            .afterClosed()
            .subscribe((newCatalog: Catalog) => {
                if (newCatalog) {
                    this.catalog = newCatalog;
                    this.onCatalogUpdate.emit(newCatalog);
                }
            });
    }

    public loginClicked(): void {
        this.dialogService.openLoginDialog();
    }

    public deletePackage(packageToDelete: Package): void {
        const dialogConfig = {
            data: {
                catalogSlug: packageToDelete.identifier.catalogSlug,
                packageSlug: packageToDelete.identifier.packageSlug,
                dontDeleteInstantly: true
            }
        };
        const dialogReference = this.dialog.open(DeletePackageComponent, dialogConfig);

        dialogReference.afterClosed().subscribe((confirmed: boolean) => {
            if (confirmed) {
                const deletionRoutePathFragments = [
                    packageToDelete.identifier.catalogSlug,
                    packageToDelete.identifier.packageSlug,
                    "delete-confirmation"
                ];
                this.router.navigate(deletionRoutePathFragments);
            }
        });
    }

    public get canManage(): boolean {
        return this.catalog && this.catalog.myPermissions?.includes(Permission.MANAGE);
    }

    public get canEdit(): boolean {
        return this.catalog && this.catalog.myPermissions?.includes(Permission.EDIT);
    }

    public follow(): void {
        const followDialogRef = this.openFollowModal();
        if (followDialogRef) {
            followDialogRef.afterClosed().subscribe((result) => {
                if (!result) {
                    return;
                }

                this.updateCatalogFollow(result.follow);
            });
        }
    }

    private loadFollowersCount(): void {
        const variables = {
            identifier: {
                catalogSlug: this.catalog.identifier.catalogSlug
            }
        };

        this.catalogFollowersCountGQL.fetch(variables).subscribe((countResponse) => {
            if (countResponse.error) {
                return;
            }

            const responseData = countResponse.data;
            this.followersCount = responseData.catalogFollowersCount;
        });
    }

    private getFollow(): void {
        if (!this.currentUser) {
            this.updateCatalogFollow(null);
            return;
        }

        this.getFollowGQL
            .fetch({
                follow: this.buildFollowIdentifier()
            })
            .subscribe((response) => {
                this.updateCatalogFollow(response.data?.getFollow);
                const shouldOpenFollowModal = this.route.snapshot.queryParamMap.get("following");

                if (shouldOpenFollowModal) {
                    if (!this.isFollowing) {
                        this.follow();
                    }
                    this.router.navigate([], { preserveFragment: true });
                }
            });
    }

    private openFollowModal(): MatDialogRef<FollowDialogComponent, FollowDialogResult> {
        if (!this.currentUser) {
            this.openLoginDialog();
        } else {
            return this.openFollowDialog();
        }
    }

    private buildFollowIdentifier(): FollowIdentifierInput {
        return {
            catalog: {
                catalogSlug: this.catalog.identifier.catalogSlug
            }
        };
    }

    private updateCatalogFollow(follow: Follow): void {
        this.catalogFollow = follow;
        this.isFollowing = follow != null;
        this.state = "SUCCESS";
    }

    private openFollowDialog(): MatDialogRef<FollowDialogComponent, FollowDialogResult> {
        return this.dialog.open(FollowDialogComponent, {
            width: "500px",
            data: {
                follow: this.catalogFollow,
                followIdentifier: this.buildFollowIdentifier()
            } as FollowDialogData
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
