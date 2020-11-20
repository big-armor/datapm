import { Component } from "@angular/core";
import { PackageFile, Schema } from "datapm-lib";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { Package } from "src/generated/graphql";
import { PackageService, PackageResponse } from "../../services/package.service";

@Component({
    selector: "schema",
    templateUrl: "./package-schema.component.html",
    styleUrls: ["./package-schema.component.scss"]
})
export class PackageSchemaComponent {
    public package: Package;
    public packageFile: PackageFile;
    private unsubscribe$ = new Subject();

    constructor(private packageService: PackageService) {
        this.packageService.package.pipe(takeUntil(this.unsubscribe$)).subscribe((p: PackageResponse) => {
            if (p.error) return;
            this.package = p.package;
            if (this.package && this.package.latestVersion) {
                this.packageFile = JSON.parse(this.package.latestVersion.packageFile);
                console.log(this.packageFile);
            }
        });
    }

    getPropertyTypes(property: Schema) {
        const keys = Object.keys(property.valueTypes);
        return keys.join(",");
    }

    ngOnDestroy(): void {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }
}
