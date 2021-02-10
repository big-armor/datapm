import { Inject, ViewChild } from "@angular/core";
import { Component, OnInit } from "@angular/core";
import { FormGroup } from "@angular/forms";
import { MatDialog, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { MatStepper } from "@angular/material/stepper";
import { PackageFile, Schema } from "datapm-lib";
import { Source } from "graphql";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { PackageResponse, PackageService } from "src/app/package/services/package.service";
import { Package } from "src/generated/graphql";
import { ClientWizardComponent } from "./client-wizard/client-wizard.component";

@Component({
    selector: "app-download-package",
    templateUrl: "./download-package.component.html",
    styleUrls: ["./download-package.component.scss"]
})
export class DownloadPackageComponent implements OnInit {
    @ViewChild("stepper") private myStepper: MatStepper;

    showRawFileButton = false;

    public currentIndex: number = 0;

    package: Package;
    packageFile: PackageFile;
    schemas: Schema[] = [];

    unsubscribe$ = new Subject();

    constructor(
        private dialog: MatDialog,
        private packageService: PackageService,
        @Inject(MAT_DIALOG_DATA) public userPackage: Package
    ) {}

    ngOnInit(): void {
        this.packageService.package.pipe(takeUntil(this.unsubscribe$)).subscribe((p: PackageResponse) => {
            if (p == null || p.package == null) return;
            this.package = p.package;
            if (this.package && this.package.latestVersion) {
                this.packageFile = JSON.parse(this.package.latestVersion.packageFile);
                this.schemas = this.packageFile.schemas;
                this.showRawFileButton =
                    this.schemas.length > 0 &&
                    this.schemas.filter((s) => s.source?.type?.toLocaleLowerCase() !== "http").length === 0;
            }
        });
    }

    move(index: number) {
        this.myStepper.selectedIndex = index;
        this.currentIndex = index;
    }

    public openClientWizard() {
        const dialogRef = this.dialog.open(ClientWizardComponent, {
            width: "550px",
            panelClass: "my-custom-dialog"
        });
    }
}
