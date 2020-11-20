import { Component, OnDestroy } from "@angular/core";
import { Title } from "@angular/platform-browser";
import { ActivatedRoute, Router } from "@angular/router";
import { PackageFile } from "datapm-lib";
import { Subject } from "rxjs";
import { packageToIdentifier } from "src/app/helpers/IdentifierHelper";
import { Package } from "src/generated/graphql";
import { SnackBarService } from "src/app/services/snackBar.service";
import { PackageService } from "../../services/package.service";
import { takeUntil } from "rxjs/operators";

@Component({
    selector: "package",
    templateUrl: "./package.component.html",
    styleUrls: ["./package.component.scss"]
})
export class PackageComponent implements OnDestroy {
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
        private title: Title,
        private snackBarService: SnackBarService,
        private router: Router
    ) {
        this.packageService.package.pipe(takeUntil(this.unsubscribe$)).subscribe((p: Package) => {
            this.package = p;
            if (this.package && this.package.latestVersion) {
                this.packageFile = JSON.parse(this.package.latestVersion.packageFile);
            }
            this.title.setTitle(`${this.package?.displayName} - datapm`);
        });
    }

    ngOnInit() {
        this.catalogSlug = this.route.snapshot.paramMap.get("catalogSlug");
        this.packageSlug = this.route.snapshot.paramMap.get("packageSlug");
        this.packageService.getPackage(this.catalogSlug, this.packageSlug);
    }

    ngOnDestroy(): void {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }

    get generatedFetchCommand() {
        return this.package ? "datapm fetch " + packageToIdentifier(this.package.identifier) : "";
    }

    copyCommand() {
        const el = document.createElement("textarea");
        el.value = this.generatedFetchCommand;
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);

        this.snackBarService.openSnackBar("fetch command copied to clipboard!", "");
    }

    getRecordCount(packageFile) {
        if (packageFile == null) return "";

        return packageFile.schemas.reduce((a, b) => a + (b.recordCount || 0), 0);
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
}
