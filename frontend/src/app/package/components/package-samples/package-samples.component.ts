import { Component } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { PackageFile, Schema } from "datapm-lib";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { Package } from "src/generated/graphql";
import { PackageService, PackageResponse } from "../../services/package.service";
import { SamplesFullScreenDialog } from "./samples-fullscreen-dialog.component";

type State = "NO_SAMPLES" | "LOADING" | "ERROR" | "LOADED";

@Component({
    selector: "samples",
    templateUrl: "./package-samples.component.html",
    styleUrls: ["./package-samples.component.scss"]
})
export class PackageSamplesComponent {
    public package: Package;
    public packageFile: PackageFile;
    private unsubscribe$ = new Subject();
    public state: State = "LOADING";

    public valuesToDisplay: { [key: string]: string }[];

    constructor(private packageService: PackageService, private dialog: MatDialog) {
        this.state = "LOADING";

        this.packageService.package.pipe(takeUntil(this.unsubscribe$)).subscribe((p: PackageResponse) => {
            if (p == null || p.package == null) return;
            this.package = p.package;
            if (this.package && this.package.latestVersion) {
                this.packageFile = JSON.parse(this.package.latestVersion.packageFile);

                if (
                    this.packageFile.schemas[0].sampleRecords == null ||
                    this.packageFile.schemas[0].sampleRecords.length == 0
                ) {
                    this.state = "NO_SAMPLES";
                    return;
                }

                this.state = "LOADED";

                //Object.keys(this.packageFile.schemas[0].properties);
            }
        });
    }

    ngOnDestroy(): void {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }

    showSchemaFullScreen(schema: Schema) {
        this.dialog.open(SamplesFullScreenDialog, {
            width: "95vw",
            height: "95vh",
            maxWidth: "95vw",
            maxHeight: "95vh",
            data: {
                schema,
                packageFile: this.packageFile,
                package: this.package
            }
        });
    }
}
