import { Component, OnDestroy } from "@angular/core";
import { Title } from "@angular/platform-browser";
import { ActivatedRoute, Router } from "@angular/router";
import { PackageFile } from "datapm-lib";
import { Subject } from "rxjs";
import { Package, User, UserGQL } from "src/generated/graphql";
import { PackageService, PackageResponse } from "../../services/package.service";
import { takeUntil } from "rxjs/operators";
import { MatDialog } from "@angular/material/dialog";
import { LoginDialogComponent } from "src/app/shared/header/login-dialog/login-dialog.component";
import { AuthenticationService } from "src/app/services/authentication.service";

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
    State = State;
    state = State.LOADING;

    public package: Package;
    public packageFile: PackageFile;

    private unsubscribe$ = new Subject();

    public readonly routes = [
        { linkName: "description", url: "" },
        { linkName: "schema", url: "schema" },
        { linkName: "version", url: "version" }
    ];

    private catalogSlug = "";
    private packageSlug = "";

    public catalogUser: User;
    public currentUser: User;

    constructor(
        private route: ActivatedRoute,
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
                            console.error(JSON.stringify(value));
                            return;
                        }

                        this.catalogUser = value.data.user;
                    });
            },
            (error) => {
                if (error.message.includes("NOT_AUTHENTICATED")) this.state = State.ERROR_NOT_AUTHENTICATED;
                else {
                    this.state = State.ERROR;
                    console.error(error);
                }
            }
        );
    }

    ngOnInit() {
        this.state = State.LOADING;
        this.catalogSlug = this.route.snapshot.paramMap.get("catalogSlug");
        this.packageSlug = this.route.snapshot.paramMap.get("packageSlug");
        this.packageService.getPackage(this.catalogSlug, this.packageSlug);

        this.authenticationService
            .getUserObservable()
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe(async (response) => {
                this.currentUser = await response;
            });
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

    loginClicked() {
        this.dialog.open(LoginDialogComponent, {
            disableClose: true
        });
    }

    getPackageIdentifierFromURL() {
        const activeRouteParts = this.router.url.split("/");
        return activeRouteParts[1] + "/" + activeRouteParts[2];
    }
}
