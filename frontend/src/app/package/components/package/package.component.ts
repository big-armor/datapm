import { Component, OnDestroy, TemplateRef, ViewChild } from "@angular/core";
import { Title } from "@angular/platform-browser";
import { ActivatedRoute, NavigationEnd, Router } from "@angular/router";
import { PackageFile } from "datapm-lib";
import { Subject } from "rxjs";
import { CurrentUser, OrderBy, PackageFollowersCountGQL, PackageIssuesGQL } from "src/generated/graphql";
import { Follow, Package, Permission, User, UserGQL, GetFollowGQL, FollowIdentifierInput } from "src/generated/graphql";
import { PackageService, PackageResponse } from "../../services/package.service";
import { filter, takeUntil } from "rxjs/operators";
import { MatDialog, MatDialogRef } from "@angular/material/dialog";
import { LoginDialogComponent } from "src/app/shared/header/login-dialog/login-dialog.component";
import { AuthenticationService } from "src/app/services/authentication.service";
import { SnackBarService } from "src/app/services/snackBar.service";
import { packageToIdentifier } from "src/app/helpers/IdentifierHelper";
import {
    FollowDialogComponent,
    FollowDialogResult
} from "src/app/shared/dialogs/follow-dialog/follow-dialog.component";

enum State {
    LOADING,
    LOADED,
    ERROR,
    ERROR_PACKAGE_FILE_NOT_FOUND,
    ERROR_NOT_AUTHENTICATED,
    ERROR_NOT_AUTHORIZED,
    ERROR_NOT_FOUND
}
@Component({
    selector: "package",
    templateUrl: "./package.component.html",
    styleUrls: ["./package.component.scss"]
})
export class PackageComponent implements OnDestroy {
    private readonly unsubscribe$ = new Subject();

    @ViewChild("derivedFrom")
    public derivedFromDialogTemplate: TemplateRef<any>;

    public State = State;
    public state = State.LOADING;

    public package: Package;
    public packageFile: PackageFile;

    public routes = [
        { linkName: "description", url: "", showDetails: true, isHidden: false },
        { linkName: "issues", url: "issues", showDetails: false, isHidden: false },
        { linkName: "history", url: "history", showDetails: true, isHidden: false },
        { linkName: "followers", url: "followers", showDetails: false, isHidden: false }
    ];

    public catalogUser: User;
    public currentUser: CurrentUser;

    public issuesCount: number;
    public followersCount: number;
    public packageFollow: Follow;
    public isFollowing: boolean;

    private catalogSlug = "";
    private packageSlug = "";

    constructor(
        public dialog: MatDialog,
        private route: ActivatedRoute,
        private snackBarService: SnackBarService,
        private packageService: PackageService,
        private title: Title,
        private router: Router,
        private userGql: UserGQL,
        private authenticationService: AuthenticationService,
        private packageIssuesGQL: PackageIssuesGQL,
        private getFollowGQL: GetFollowGQL,
        private packageFollowersCountGQL: PackageFollowersCountGQL
    ) {
        this.packageService.package.pipe(takeUntil(this.unsubscribe$)).subscribe(
            (p: PackageResponse) => {
                if (p == null) return;
                if (this.package && p.package.identifier != this.package.identifier) {
                    this.catalogUser = null;
                }

                if (p.package == null && p.response == null) {
                    this.state = State.ERROR;
                    return;
                }

                if(p.response.errors) {
                    if(p.response.errors.some((e) => e.message.includes("PACKAGE_FILE_NOT_FOUND"))) {
                        this.state = State.ERROR_PACKAGE_FILE_NOT_FOUND;
                    } else {
                        if (p.response.errors.some((e) => e.message.includes("NOT_AUTHENTICATED")))
                            this.state = State.ERROR_NOT_AUTHENTICATED;
                        else if (p.response.errors.some((e) => e.message.includes("NOT_AUTHORIZED")))
                            this.state = State.ERROR_NOT_AUTHORIZED;
                        else if (p.response.errors.some((e) => e.message.includes("CATALOG_NOT_FOUND")))
                            this.state = State.ERROR_NOT_FOUND;
                        else if (p.response.errors.some((e) => e.message.includes("PACKAGE_NOT_FOUND")))
                            this.state = State.ERROR_NOT_FOUND;
                        else this.state = State.ERROR;
                        return;
                    }
                } else {
                    this.state = State.LOADED;
                }


                this.package = p.package;
                this.loadPackageIssues();
                this.loadPackageFollowersCount();
                this.getFollow();
                if (this.package && this.package.latestVersion) {
                    this.packageFile = JSON.parse(this.package.latestVersion.packageFile);
                } else {
                    this.packageFile = null;
                }
                this.title.setTitle(`${this.package?.displayName} - datapm`);
                this.userGql
                    .fetch({
                        username: this.package.identifier.catalogSlug
                    })
                    .toPromise()
                    .then((value) => {
                        if (value.data == null) {
                            return;
                        }

                        this.catalogUser = value.data.user;
                    });

                this.routes = [
                    { linkName: "description", url: "", showDetails: true, isHidden: false },
                    { linkName: "issues", url: "issues", showDetails: false, isHidden: false },
                    { linkName: "history", url: "history", showDetails: true, isHidden: false },
                    { linkName: "followers", url: "followers", showDetails: false, isHidden: false }
                ];
                if (this.package?.myPermissions.includes(Permission.MANAGE)) {
                    this.routes.push({ linkName: "manage", url: "manage", showDetails: false, isHidden: false });
                    this.routes.push({ linkName: "readme", url: "readme", showDetails: false, isHidden: true });
                    this.routes.push({ linkName: "license", url: "license", showDetails: false, isHidden: true });
                }
            },
            (error) => {
                if (error.message.includes("NOT_AUTHENTICATED")) this.state = State.ERROR_NOT_AUTHENTICATED;
                else {
                    this.state = State.ERROR;
                }
            }
        );
    }

    public ngOnInit(): void {
        this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event: NavigationEnd) => {
            this.updateFromUrl();
        });

        this.updateFromUrl();

        this.authenticationService.currentUser.pipe(takeUntil(this.unsubscribe$)).subscribe((user: CurrentUser) => {
            this.currentUser = user;
        });
    }

    public ngOnDestroy(): void {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }

    public tabClick(url: string): void {
        let route;
        if (url == "") {
            route = this.catalogSlug + "/" + this.packageSlug;
        } else {
            route = this.catalogSlug + "/" + this.packageSlug + "/" + url;
        }

        this.router.navigate([route]);
    }

    public isActiveTab(route): boolean {
        const activeRouteParts = this.router.url.split("/");
        if (activeRouteParts.length == 3) {
            return route.url == "";
        }

        return activeRouteParts[3].split("?")[0] == route.url;
    }

    shouldShowDetails(): boolean {
        return this.getActiveTab().showDetails;
    }

    public getActiveTab() {
        const activeRouteParts = this.router.url.split("/");

        let route = this.routes.find((r) => r.url == activeRouteParts[3]);
        if (!route) {
            route = this.routes[0];
        }
        return route;
    }

    public loginClicked(): void {
        this.dialog.open(LoginDialogComponent, {
            disableClose: true
        });
    }

    public getCatalogSlugFromURL(): string {
        const activeRouteParts = this.router.url.split("/");
        return activeRouteParts[1];
    }

    public getPackageSlugFromURL(): string {
        const activeRouteParts = this.router.url.split("/");
        return activeRouteParts[2];
    }

    public getPackageIdentifierFromURL(): string {
        const activeRouteParts = this.router.url.split("/");
        return activeRouteParts[1] + "/" + activeRouteParts[2];
    }

    public openDerivedFromModal(packageFile: PackageFile): void {
        this.dialog.open(this.derivedFromDialogTemplate, {
            data: packageFile
        });
    }

    public derivedFromCount(packageFile: PackageFile): number {
        if (packageFile == null) {
            return 0;
        }
        return packageFile.schemas.reduce((count, schema) => count + (schema.derivedFrom?.length || 0), 0);
    }

    public copyCommand() {
        const el = document.createElement("textarea");
        el.value = packageToIdentifier(this.package.identifier);
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);

        this.snackBarService.openSnackBar("package slug copied to clipboard!", "");
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

    private updateFromUrl(): void {
        const newCatalog = this.route.snapshot.paramMap.get("catalogSlug");
        const newPackage = this.route.snapshot.paramMap.get("packageSlug");

        if (this.catalogSlug != newCatalog || this.packageSlug != newPackage) {
            this.state = State.LOADING;
            this.catalogSlug = newCatalog;
            this.packageSlug = newPackage;

            this.packageService.getPackage(this.catalogSlug, this.packageSlug);
        }
    }

    private loadPackageIssues(): void {
        const variables = {
            packageIdentifier: {
                catalogSlug: this.catalogSlug,
                packageSlug: this.packageSlug
            },
            includeOpenIssues: false,
            includeClosedIssues: false,
            offset: 0,
            limit: 0,
            orderBy: OrderBy.UPDATED_AT
        };

        this.packageIssuesGQL.fetch(variables).subscribe((issuesResponse) => {
            if (issuesResponse.error) {
                return;
            }

            const responseData = issuesResponse.data.packageIssues;
            this.issuesCount = responseData.openIssuesCount;
        });
    }

    private loadPackageFollowersCount(): void {
        const variables = {
            identifier: {
                catalogSlug: this.catalogSlug,
                packageSlug: this.packageSlug
            }
        };

        this.packageFollowersCountGQL.fetch(variables).subscribe((countResponse) => {
            if (countResponse.error) {
                return;
            }

            const responseData = countResponse.data;
            this.followersCount = responseData.packageFollowersCount;
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
            package: {
                catalogSlug: this.package.identifier.catalogSlug,
                packageSlug: this.package.identifier.packageSlug
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
        this.packageFollow = follow;
        this.isFollowing = follow != null;
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

    private openFollowDialog(): MatDialogRef<FollowDialogComponent, FollowDialogResult> {
        return this.dialog.open(FollowDialogComponent, {
            width: "500px",
            data: {
                follow: this.packageFollow,
                followIdentifier: this.buildFollowIdentifier()
            }
        });
    }
}
