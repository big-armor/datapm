import { Inject, ViewChild } from "@angular/core";
import { Component, OnInit } from "@angular/core";
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { MatStepper } from "@angular/material/stepper";
import { PackageFile, Source } from "datapm-lib";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { PackageResponse, PackageService } from "src/app/package/services/package.service";
import { CapabilitiesService } from "src/app/services/capabilities-impl.service";
import { DialogService } from "src/app/services/dialog/dialog.service";
import { ConnectorDescription, Package } from "src/generated/graphql";
import { ClientWizardComponent } from "./client-wizard/client-wizard.component";

enum STATE {
    LOADING,
    ERROR,
    SUCCESS
}

@Component({
    selector: "app-download-package",
    templateUrl: "./download-package.component.html",
    styleUrls: ["./download-package.component.scss"]
})
export class DownloadPackageComponent implements OnInit {
    STATE = STATE;
    state = STATE.LOADING;

    @ViewChild("stepper") private myStepper: MatStepper;

    showRawFileButton = false;

    public currentIndex: number = 0;

    package: Package;
    packageFile: PackageFile;
    packageSources: Source[] = [];

    unsubscribe$ = new Subject();

    connectors: ConnectorDescription[] = [];
    selectedConnector: ConnectorDescription;

    constructor(
        private dialog: MatDialog,
        private dialogService: DialogService,
        private packageService: PackageService,
        private capabilitiesService: CapabilitiesService,
        private dialogRef: MatDialogRef<DownloadPackageComponent>,
        @Inject(MAT_DIALOG_DATA) public userPackage: Package
    ) {}

    ngOnInit(): void {
        this.loadConnectors();
        this.packageService.package.pipe(takeUntil(this.unsubscribe$)).subscribe((p: PackageResponse) => {
            if (p == null || p.package == null) return;
            this.package = p.package;
            if (this.package && this.package.latestVersion) {
                this.packageFile = JSON.parse(this.package.latestVersion.packageFile);
                this.packageSources = this.packageFile.sources;
                this.showRawFileButton =
                    this.packageSources.length > 0 &&
                    this.packageSources.filter((s) => s?.type?.toLocaleLowerCase() !== "http").length === 0;
            }
        });
    }

    move(index: number) {
        this.myStepper.selectedIndex = index;
        this.currentIndex = index;
    }

    public openClientWizard() {
        this.dialog.open(ClientWizardComponent, {
            width: "550px",
            panelClass: "my-custom-dialog"
        });

        this.dialogRef.close();
    }

    public openFetchModal(sinkType: string) {
        this.dialogService.openFetchCommandDialog({
            catalogSlug: this.package.identifier.catalogSlug,
            packageSlug: this.package.identifier.packageSlug,
            sinkType,
            defaults: true
        });

        this.dialogRef.close();
    }

    private async loadConnectors(): Promise<void> {
        this.state = STATE.LOADING;
        try {
            const allConnectors = await this.capabilitiesService.listConnectors();
            this.connectors = allConnectors.filter((c) => c.hasSink);
        } catch (e) {
            this.state = STATE.ERROR;
            return;
        }
        this.state = STATE.SUCCESS;
    }

    connectorSelected(connector: ConnectorDescription) {
        this.selectedConnector = connector;
        this.move(2);
    }
}
