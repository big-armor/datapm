import { Component, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { PackageFile, Schema } from "datapm-lib";
import { take } from "rxjs/operators";
import { Package } from "src/generated/graphql";

@Component({
    selector: "schema",
    templateUrl: "./package-schema.component.html",
    styleUrls: ["./package-schema.component.scss"]
})
export class PackageSchemaComponent {
    public package: Package;
    public packageFile: PackageFile;

    constructor(private route: ActivatedRoute) {
        this.route.parent.data.pipe(take(1)).subscribe((data) => {
            this.package = data.package;
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
}
