import { formatNumber } from "@angular/common";
import { Component, Input, OnChanges, OnInit } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { CountPrecision, PackageFile, StreamSet } from "datapm-lib";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { AddPackageComponent } from "src/app/collection-details/add-package/add-package.component";
import { packageToIdentifier } from "src/app/helpers/IdentifierHelper";
import { AuthenticationService } from "src/app/services/authentication.service";
import { SnackBarService } from "src/app/services/snackBar.service";
import { CommandModalComponent } from "src/app/shared/command-modal/command-modal.component";
import { UpdateModalComponent } from "src/app/shared/command-modal/update/update-modal.component";
import { ShareDialogComponent } from "src/app/shared/dialogs/share-dialog/share-dialog.component";
import { CurrentUser, Package, Permission } from "src/generated/graphql";
import { PackageService } from "../../services/package.service";
import { AddUserComponent } from "../add-user/add-user.component";
import { ClientWizardComponent } from "./download-package/client-wizard/client-wizard.component";
import { DownloadPackageComponent } from "./download-package/download-package.component";
import { EditWebsiteDialogComponent } from "./edit-website-dialog/edit-website-dialog.component";

@Component({
    selector: "app-package-info",
    templateUrl: "./package-info.component.html",
    styleUrls: ["./package-info.component.scss"]
})
export class PackageInfoComponent implements OnInit, OnChanges {
    Permission = Permission;

    @Input()
    public package: Package;

    @Input()
    public packageFile: PackageFile;

    public currentUser: CurrentUser;
    public packageUnit: string;

    public packageSizeBytes: number = 0;

    private unsubscribe$ = new Subject();

    constructor(
        private snackBarService: SnackBarService,
        private dialog: MatDialog,
        private authenticationService: AuthenticationService,
        private packageService: PackageService
    ) {}

    public ngOnInit(): void {
        this.authenticationService.currentUser
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((user: CurrentUser) => (this.currentUser = user));
    }

    public ngOnChanges(): void {
        this.packageUnit = this.parsePackageUnit();

        if (this.packageFile) {
            this.packageSizeBytes =
                this.packageFile.sources?.reduce(
                    (sum, item) => sum + item.streamSets.reduce((sum, item) => sum + item.streamStats.byteCount, 0),
                    0
                ) || 0;
        }
    }

    public getRecordCount(packageFile: PackageFile): string {
        if (packageFile == null) {
            return "";
        }

        const streamSets = packageFile.sources.reduce((a, b) => [...a, ...b.streamSets], new Array<StreamSet>());

        const count = streamSets.reduce((a, b) => a + (b.streamStats.recordCount || 0), 0);

        let prefix = "";

        let highestPrecision = CountPrecision.EXACT;

        if (streamSets.find((s) => s.streamStats.recordCountPrecision == CountPrecision.GREATER_THAN) != null)
            highestPrecision = CountPrecision.GREATER_THAN;
        else if (streamSets.find((s) => s.streamStats.recordCountPrecision == CountPrecision.APPROXIMATE) != null)
            highestPrecision = CountPrecision.APPROXIMATE;

        if (highestPrecision == CountPrecision.GREATER_THAN) {
            prefix = ">";
        } else if (highestPrecision == CountPrecision.APPROXIMATE) {
            prefix = "~";
        }

        return prefix + formatNumber(count, "en-US");
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
            const dialogRef = this.dialog.open(ShareDialogComponent, {
                data: {
                    displayName: this.package.displayName,
                    url: this.package.identifier.catalogSlug + "/" + this.package.identifier.packageSlug
                },
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
            width: "500px"
        });
    }

    public openWizard() {
        const dialogRef = this.dialog.open(ClientWizardComponent, {
            width: "550px",
            panelClass: "my-custom-dialog"
        });
    }

    public editLink() {
        const dialogRef = this.dialog.open(EditWebsiteDialogComponent, {
            width: "450px",
            data: {
                package: this.package,
                packageFile: this.packageFile
            }
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

    public refreshData() {
        const dialogRef = this.dialog
            .open(UpdateModalComponent, {
                data: {
                    targetPackage: this.package.identifier,
                    command: "update"
                },
                width: "90vw",
                maxWidth: "800px",
                height: "90vh",
                maxHeight: "600px",
                disableClose: true,
                panelClass: "command-modal"
            })
            .afterClosed()
            .subscribe(() => {});
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
