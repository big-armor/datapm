import { Component, OnInit } from "@angular/core";
import {
    Catalog,
    Follow,
    FollowIdentifierInput,
    GetCatalogGQL,
    GetFollowGQL,
    NotificationFrequency,
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
    FollowDialogResult
} from "src/app/shared/dialogs/follow-dialog/follow-dialog.component";
import { AuthenticationService } from "src/app/services/authentication.service";

@Component({
    selector: "app-catalog-details",
    templateUrl: "./catalog-details.component.html",
    styleUrls: ["./catalog-details.component.scss"]
})
export class CatalogDetailsComponent implements OnInit {
    public catalogSlug = "";
    public catalog: Catalog;
    public state: PageState | "CATALOG_NOT_FOUND" | "NOT_AUTHENTICATED" = "INIT";
    public currentTab = 0;

    public currentUser: User;

    public catalogFollow: Follow;
    public isFollowing: boolean;

    private unsubscribe$: Subject<any> = new Subject();
    private tabs = ["", "manage"];

    constructor(
        private getCatalogGQL: GetCatalogGQL,
        private dialog: MatDialog,
        private router: Router,
        private route: ActivatedRoute,
        private dialogService: DialogService,
        private getFollowGQL: GetFollowGQL,
        private authenticationService: AuthenticationService
    ) {
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
    }

    public updateTabParam() {
        const tab = this.tabs[this.currentTab];
        const extras: NavigationExtras = {
            relativeTo: this.route
        };

        if (tab !== "") {
            extras.fragment = tab;
        }

        this.router.navigate(["."], extras);
    }

    public ngOnInit(): void {
        this.authenticationService.currentUser.pipe(takeUntil(this.unsubscribe$)).subscribe((user: User) => {
            this.currentUser = user;
        });

        this.catalogSlug = this.route.snapshot.paramMap.get("catalogSlug");
        this.state = "LOADING";
        this.getCatalogGQL.fetch({ identifier: { catalogSlug: this.catalogSlug } }).subscribe(({ data, errors }) => {
            if (errors) {
                if (errors.find((e) => e.message.includes("CATALOG_NOT_FOUND"))) {
                    this.state = "CATALOG_NOT_FOUND";
                } else if (errors.find((e) => e.message.includes("NOT_AUTHENTICATED"))) {
                    this.state = "NOT_AUTHENTICATED";
                } else {
                    this.state = "ERROR";
                }
                return;
            }

            this.catalog = data.catalog as Catalog;
            this.getFollow();
            this.state = "SUCCESS";
        });
    }

    ngOnDestroy(): void {
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
        this.openFollowModal()
            .afterClosed()
            .subscribe((result) => {
                if (!result) {
                    return;
                }

                this.updatePackageFollow(result.follow);
            });
    }

    private getFollow(): void {
        this.getFollowGQL
            .fetch({
                follow: this.buildFollowIdentifier()
            })
            .subscribe((response) => this.updatePackageFollow(response.data?.getFollow));
    }

    private openFollowModal(): MatDialogRef<FollowDialogComponent, FollowDialogResult> {
        return this.dialog.open(FollowDialogComponent, {
            width: "500px",
            data: {
                follow: this.catalogFollow,
                followIdentifier: this.buildFollowIdentifier()
            }
        });
    }

    private buildFollowIdentifier(): FollowIdentifierInput {
        return {
            catalog: {
                catalogSlug: this.catalogSlug
            }
        };
    }

    private updatePackageFollow(follow: Follow): void {
        this.catalogFollow = follow;
        this.isFollowing = follow != null;
    }
}
