import { Component, OnDestroy } from "@angular/core";
import { Title } from "@angular/platform-browser";
import { ActivatedRoute, Router } from "@angular/router";
import { PackageFile } from "datapm-lib";
import { Subject } from "rxjs";
import { Package } from "src/generated/graphql";
import { PackageService, PackageResponse } from "../../services/package.service";
import { takeUntil } from "rxjs/operators";
import { MatDialog } from "@angular/material/dialog";
import { LoginDialogComponent } from "src/app/shared/header/login-dialog/login-dialog.component";

enum State {
    LOADING,
    LOADED,
    ERROR,
    ERROR_NOT_AUTHENTICATED
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

    constructor(
        private route: ActivatedRoute,
        private packageService: PackageService,
        public dialog: MatDialog,
        private title: Title,
        private router: Router
    ) {
        this.packageService.package.pipe(takeUntil(this.unsubscribe$)).subscribe(
            (p: PackageResponse) => {
                if (p == null) return;

                if (p.package == null) {
                    if (p.response?.errors.some((e) => e.message.includes("NOT_AUTHENTICATED")))
                        this.state = State.ERROR_NOT_AUTHENTICATED;
                    else this.state = State.ERROR;
                    return;
                }
                this.package = p.package;
                if (this.package && this.package.latestVersion) {
                    this.packageFile = JSON.parse(this.package.latestVersion.packageFile);
                }
                this.title.setTitle(`${this.package?.displayName} - datapm`);
                this.state = State.LOADED;
            },
            (error) => {
                if (error.message.includes("NOT_AUTHENTICATED")) this.state = State.ERROR_NOT_AUTHENTICATED;
                else this.state = State.ERROR;
            }
        );
    }

    ngOnInit() {
        this.state = State.LOADING;
        this.catalogSlug = this.route.snapshot.paramMap.get("catalogSlug");
        this.packageSlug = this.route.snapshot.paramMap.get("packageSlug");
        this.packageService.getPackage(this.catalogSlug, this.packageSlug);
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
}
