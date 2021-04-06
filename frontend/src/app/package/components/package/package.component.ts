import { Component, OnDestroy, TemplateRef, ViewChild } from "@angular/core";
import { Title } from "@angular/platform-browser";
import { ActivatedRoute, NavigationEnd, Router } from "@angular/router";
import { PackageFile } from "datapm-lib";
import { Subject } from "rxjs";
import { Package, Permission, User, UserGQL } from "src/generated/graphql";
import { PackageService, PackageResponse } from "../../services/package.service";
import { filter, takeUntil } from "rxjs/operators";
import { MatDialog } from "@angular/material/dialog";
import { LoginDialogComponent } from "src/app/shared/header/login-dialog/login-dialog.component";
import { AuthenticationService } from "src/app/services/authentication.service";
import { SnackBarService } from "src/app/services/snackBar.service";
import { packageToIdentifier } from "src/app/helpers/IdentifierHelper";
import { FollowDialogComponent } from "src/app/shared/dialogs/follow-dialog/follow-dialog.component";

enum State {
    LOADING,
    LOADED,
    ERROR,
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
    @ViewChild("derivedFrom") derivedFromDialogTemplate: TemplateRef<any>;

    State = State;
    state = State.LOADING;

    public package: Package;
    public packageFile: PackageFile;

    private unsubscribe$ = new Subject();

    public routes = [
        { linkName: "description", url: "", showDetails: true },
        { linkName: "issues", url: "issues", showDetails: true },
        { linkName: "history", url: "history", showDetails: true }
    ];

    private catalogSlug = "";
    private packageSlug = "";

    public catalogUser: User;
    public currentUser: User;

    constructor(
        private route: ActivatedRoute,
        private snackBarService: SnackBarService,
        private packageService: PackageService,
        public dialog: MatDialog,
        private title: Title,
        private router: Router,
        private userGql: UserGQL,
        private authenticationService: AuthenticationService
    ) {
        this.packageService.package.pipe(takeUntil(this.unsubscribe$)).subscribe(
            (p: PackageResponse) => {
                if (p == null) return;
                if (this.package && p.package.identifier != this.package.identifier) {
                    this.catalogUser = null;
                }

                if (p.package == null && p.response != null) {
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
                } else if (p.package == null && p.response == null) {
                    this.state = State.ERROR;
                    return;
                }
                this.package = p.package;
                if (this.package && this.package.latestVersion) {
                    this.packageFile = JSON.parse(this.package.latestVersion.packageFile);
                } else {
                    this.packageFile = null;
                }
                this.title.setTitle(`${this.package?.displayName} - datapm`);
                this.state = State.LOADED;
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
                    { linkName: "description", url: "", showDetails: true },
                    { linkName: "issues", url: "issues", showDetails: false },
                    { linkName: "preview", url: "preview", showDetails: true },
                    { linkName: "schema", url: "schema", showDetails: true },
                    { linkName: "history", url: "history", showDetails: true }
                ];
                if (this.package?.myPermissions.includes(Permission.MANAGE)) {
                    this.routes.push({ linkName: "manage", url: "manage", showDetails: false });
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

    ngOnInit() {
        this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event: NavigationEnd) => {
            this.updateFromUrl();
        });

        this.updateFromUrl();

        this.authenticationService.currentUser.pipe(takeUntil(this.unsubscribe$)).subscribe((user: User) => {
            this.currentUser = user;
        });
    }

    updateFromUrl() {
        const newCatalog = this.route.snapshot.paramMap.get("catalogSlug");
        const newPackage = this.route.snapshot.paramMap.get("packageSlug");

        if (this.catalogSlug != newCatalog || this.packageSlug != newPackage) {
            this.state = State.LOADING;
            this.catalogSlug = newCatalog;
            this.packageSlug = newPackage;

            this.packageService.getPackage(this.catalogSlug, this.packageSlug);
        }
    }

    ngOnDestroy(): void {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }

    tabClick(url) {
        let route = this.catalogSlug + "/" + this.packageSlug + "/" + url;
        if (url == "") route = this.catalogSlug + "/" + this.packageSlug;

        this.router.navigate([route]);
    }

    isActiveTab(route) {
        const activeRouteParts = this.router.url.split("/");

        if (activeRouteParts.length == 3) return route.url == "";
        return activeRouteParts[3] == route.url;
    }

    getActiveTab() {
        const activeRouteParts = this.router.url.split("/");

        let route = this.routes.find((r) => r.url == activeRouteParts[3]);
        if (!route) {
            route = this.routes[0];
        }
        return route;
    }

    loginClicked() {
        this.dialog.open(LoginDialogComponent, {
            disableClose: true
        });
    }

    getCatalogSlugFromURL() {
        const activeRouteParts = this.router.url.split("/");
        return activeRouteParts[1];
    }

    getPackageSlugFromURL() {
        const activeRouteParts = this.router.url.split("/");
        return activeRouteParts[2];
    }

    getPackageIdentifierFromURL() {
        const activeRouteParts = this.router.url.split("/");
        return activeRouteParts[1] + "/" + activeRouteParts[2];
    }

    openDerivedFromModal(packageFile: PackageFile) {
        this.dialog.open(this.derivedFromDialogTemplate, {
            data: packageFile
        });
    }

    derivedFromCount(packageFile: PackageFile) {
        if (packageFile == null) return 0;
        return packageFile.schemas.reduce((count, schema) => count + (schema.derivedFrom?.length || 0), 0);
    }

    public createFollow() {
        const dlgRef = this.dialog.open(FollowDialogComponent, {
            width: "500px"
        });
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
}
