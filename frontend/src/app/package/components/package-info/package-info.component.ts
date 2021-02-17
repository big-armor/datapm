import { Component, Input, OnChanges, OnInit } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { PackageFile } from "datapm-lib";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { AddPackageComponent } from "src/app/collection-details/add-package/add-package.component";
import { packageToIdentifier } from "src/app/helpers/IdentifierHelper";
import { AuthenticationService } from "src/app/services/authentication.service";
import { SnackBarService } from "src/app/services/snackBar.service";
import { Package, User } from "src/generated/graphql";
import { AddUserComponent } from "../add-user/add-user.component";
import { DownloadPackageComponent } from "./download-package/download-package.component";
import { SharePackageComponent } from "./share-package/share-package.component";

@Component({
    selector: "app-package-info",
    templateUrl: "./package-info.component.html",
    styleUrls: ["./package-info.component.scss"]
})
export class PackageInfoComponent implements OnInit, OnChanges {
    @Input() public package: Package;
    @Input() public packageFile: PackageFile;

    public currentUser: User;
    public packageUnit: string;

    private unsubscribe$ = new Subject();

    constructor(
        private snackBarService: SnackBarService,
        private dialog: MatDialog,
        private authenticationService: AuthenticationService
    ) {}

    public ngOnInit(): void {
        this.authenticationService.currentUser.pipe(takeUntil(this.unsubscribe$)).subscribe((user: User) => {
            this.currentUser = user;
        });
    }

    public ngOnChanges(): void {
        this.packageUnit = this.parsePackageUnit();
    }

    public getRecordCount(packageFile): string {
        if (packageFile == null) {
            return "";
        }

        return packageFile.schemas.reduce((a, b) => a + (b.recordCount || 0), 0);
    }

    public get generatedFetchCommand() {
        return this.package ? "datapm fetch " + packageToIdentifier(this.package.identifier) : "";
    }

    public parsePackageUnit(): string {
        if (!this.packageFile || !this.packageFile.schemas.length) {
            return null;
        }

        let unit = this.packageFile.schemas[0].unit;
        const hasMultipleUnits = this.packageFile.schemas.find((schema) => schema.unit && schema.unit != unit);
        return hasMultipleUnits ? null : unit;
    }

    public copyCommand() {
        const el = document.createElement("textarea");
        el.value = this.generatedFetchCommand;
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);

        this.snackBarService.openSnackBar("fetch command copied to clipboard!", "");
    }

    public sharePackage() {
        if (this.package.isPublic) {
            const dialogRef = this.dialog.open(SharePackageComponent, {
                data: this.package,
                width: "450px"
            });
        } else {
            const dialogRef = this.dialog.open(AddUserComponent, {
                data: {
                    catalogSlug: this.package.identifier.catalogSlug,
                    packageSlug: this.package.identifier.packageSlug
                }
            });
        }
    }

    public downloadPackage() {
        const dialogRef = this.dialog.open(DownloadPackageComponent, {
            data: this.package,
            width: "430px"
        });
    }

    public canManage() {
        const isPublic = this.package.myPermissions.filter((permission) => permission === "MANAGE").length > 0;
        return isPublic;
    }

    public canShare() {
        if (this.package.isPublic || this.canManage()) {
            return true;
        } else {
            return false;
        }
    }

    addToCollection(packageObject: Package) {
        const dialogRef = this.dialog.open(AddPackageComponent, {
            data: {
                packageIdentifier: this.package.identifier
            },
            width: "600px"
        });
    }
}
