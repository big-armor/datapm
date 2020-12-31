import { Component, TemplateRef, ViewChild } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { PackageFile, Schema, ValueTypes, ValueTypeStatistics } from "datapm-lib";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { Package } from "src/generated/graphql";
import { PackageService, PackageResponse } from "../../services/package.service";
import { SamplesFullScreenDialog } from "../package-samples/samples-fullscreen-dialog.component";

@Component({
    selector: "schema",
    templateUrl: "./package-schema.component.html",
    styleUrls: ["./package-schema.component.scss"]
})
export class PackageSchemaComponent {
    public package: Package;
    public packageFile: PackageFile;
    private unsubscribe$ = new Subject();

    constructor(private packageService: PackageService, private dialog: MatDialog) {
        this.packageService.package.pipe(takeUntil(this.unsubscribe$)).subscribe((p: PackageResponse) => {
            if (p == null || p.package == null) return;
            this.package = p.package;
            if (this.package && this.package.latestVersion) {
                this.packageFile = JSON.parse(this.package.latestVersion.packageFile);
            }
        });
    }

    getPropertyTypes(property: Schema) {
        const keys = Object.keys(property.valueTypes).sort();
        return keys.join(",");
    }

    ngOnDestroy(): void {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }

    schemaPropertiesLength(schema: Schema) {
        return Object.keys(schema.properties).length;
    }

    showSamplesFullscreen(schema: Schema) {
        this.dialog.open(SamplesFullScreenDialog, {
            width: "95vw",
            height: "95vh",
            maxWidth: "95vw",
            maxHeight: "95vh",
            data: {
                schema
            }
        });
    }

    stringOptions(valueTypes: ValueTypeStatistics): { name: string; value: number }[] {
        return Object.keys(valueTypes)
            .map((v) => {
                return {
                    name: v,
                    value: valueTypes[v]
                };
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    }
}
