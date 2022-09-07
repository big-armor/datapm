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
import { EditCollectionComponent } from "src/app/shared/edit-collection/edit-collection.component";
import { LoginDialogComponent } from "src/app/shared/header/login-dialog/login-dialog.component";
import {
    Collection,
    CollectionFollowersCountGQL,
    CollectionGQL,
    CurrentUser,
    Follow,
    FollowIdentifierInput,
    GetFollowGQL,
    Package,
    Permission,
    RemovePackageFromCollectionGQL,
    User
} from "src/generated/graphql";
import { AddPackageComponent } from "../add-package/add-package.component";

type CollectionDetailsPageState = PageState | "NOT_AUTHORIZED" | "NOT_FOUND";

@Component({
    selector: "app-collection-details",
    templateUrl: "./collection-details.component.html",
    styleUrls: ["./collection-details.component.scss"]
})
export class CollectionDetailsComponent implements OnDestroy {
    public collectionSlug: string = "";
    public collection: Collection;
    public state: CollectionDetailsPageState = "INIT";
    public currentTab = 0;
    private unsubscribe$: Subject<any> = new Subject();

    public currentUser: CurrentUser;

    private tabs = ["", "followers"];

    public collectionFollow: Follow;
    public followersCount: number;
    public isFollowing: boolean;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private collectionGQL: CollectionGQL,
        private removePackageFromCollectionGQL: RemovePackageFromCollectionGQL,
        private dialog: MatDialog,
        private getFollowGQL: GetFollowGQL,
        private collectionFollowersCountGQL: CollectionFollowersCountGQL,
        private authenticationService: AuthenticationService
    ) {
        this.route.paramMap.pipe(takeUntil(this.unsubscribe$)).subscribe((paramMap: ParamMap) => {
            this.collectionSlug = paramMap.get("collectionSlug") || "";
            this.getCollectionDetails();
        });

        this.authenticationService.currentUser.pipe(takeUntil(this.unsubscribe$)).subscribe((user: CurrentUser) => {
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
                displayName: this.collection.name,
                url: "collections/" + this.collection.identifier.collectionSlug
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

    private getCollectionDetails() {
        if (!this.collectionSlug) {
            return;
        }

        this.state = "LOADING";
        this.collectionGQL
            .fetch({
                identifier: {
                    collectionSlug: this.collectionSlug
                }
            })
            .subscribe(
                ({ errors, data }) => {
                    if (errors) {
                        if (errors.find((e) => e.message.includes("NOT_AUTHORIZED"))) this.state = "NOT_AUTHORIZED";
                        if (errors.find((e) => e.message.includes("COLLECTION_NOT_FOUND"))) this.state = "NOT_FOUND";
                        else this.state = "ERROR";
                        return;
                    }
                    this.collection = data.collection as Collection;
                    this.loadFollowersCount();
                    if (this.collection.myPermissions.includes(Permission.MANAGE)) {
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

    public collectionEdited(collection: Collection) {
        this.getCollectionDetails();
    }

    public addPackage() {
        const dialogRef = this.dialog.open(AddPackageComponent, {
            data: {
                collection: this.collection
            },
            width: "600px"
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (result) {
                this.getCollectionDetails();
            }
        });
    }

    public removePackage(p: Package) {
        this.removePackageFromCollectionGQL
            .mutate({
                collectionIdentifier: {
                    collectionSlug: this.collectionSlug
                },
                packageIdentifier: {
                    catalogSlug: p.identifier.catalogSlug,
                    packageSlug: p.identifier.packageSlug
                }
            })
            .subscribe(() => {
                this.getCollectionDetails();
            });
    }

    editCollection(): void {
        this.dialog
            .open(EditCollectionComponent, {
                data: this.collection
            })
            .afterClosed()
            .subscribe((newCollection: Collection) => {
                this.setCollectionVariables(newCollection);
            });
    }

    public setCollectionVariables(collection: Collection) {
        this.collection = collection;
    }

    public get canManage() {
        return this.collection && this.collection.myPermissions?.includes(Permission.MANAGE);
    }

    public get canEdit() {
        return this.collection && this.collection.myPermissions?.includes(Permission.EDIT);
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
                collectionSlug: this.collection.identifier.collectionSlug
            }
        };

        this.collectionFollowersCountGQL.fetch(variables).subscribe((countResponse) => {
            if (countResponse.error) {
                return;
            }

            const responseData = countResponse.data;
            this.followersCount = responseData.collectionFollowersCount;
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
            collection: {
                collectionSlug: this.collectionSlug
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
        this.collectionFollow = follow;
        this.isFollowing = follow != null;
    }

    private openFollowDialog(): MatDialogRef<FollowDialogComponent, FollowDialogResult> {
        return this.dialog.open(FollowDialogComponent, {
            width: "500px",
            data: {
                follow: this.collectionFollow,
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
