import { Inject, ViewChild } from "@angular/core";
import { Component, OnInit } from "@angular/core";
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { MatStepper } from "@angular/material/stepper";
import { PackageFile, Schema } from "datapm-lib";
import { SourceCategory } from "datapm-lib/src/capabilities/SourceCategory";
import { SourceDescription } from "datapm-lib/src/capabilities/SourceDescription";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { PackageResponse, PackageService } from "src/app/package/services/package.service";
import { CapabilitiesServiceImpl } from "src/app/services/capabilities-impl.service";
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

    public sources: SourceDescription[] = [];
    public databaseSources: SourceDescription[] = [];
    public fileRepositorySources: SourceDescription[] = [];
    public fileSources: SourceDescription[] = [];

    constructor(
        private dialog: MatDialog,
        private packageService: PackageService,
        private capabilitiesService: CapabilitiesServiceImpl,
        private dialogRef: MatDialogRef<DownloadPackageComponent>,
        @Inject(MAT_DIALOG_DATA) public userPackage: Package
    ) {}

    ngOnInit(): void {
        this.loadSources();
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
        const clientDialogRef = this.dialog.open(ClientWizardComponent, {
            width: "550px",
            panelClass: "my-custom-dialog"
        });

        this.dialogRef.close();
    }

    private loadSources(): void {
        this.sources = this.capabilitiesService.getSourceDescriptions();
        this.fileSources = this.sources.filter((s) => SourceCategory.FILE == s.category);
        this.fileRepositorySources = this.sources.filter((s) => SourceCategory.FILE_REPOSITORY == s.category);
        this.databaseSources = this.sources.filter((s) => SourceCategory.DATABASE == s.category);
    }
}
