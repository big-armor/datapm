import { Component, Input, OnInit } from "@angular/core";
import { PackageFile } from "datapm-lib";
import { packageToIdentifier } from "src/app/helpers/IdentifierHelper";
import { SnackBarService } from "src/app/services/snackBar.service";
import { Package } from "src/generated/graphql";

@Component({
    selector: "app-package-info",
    templateUrl: "./package-info.component.html",
    styleUrls: ["./package-info.component.scss"]
})
export class PackageInfoComponent implements OnInit {
    @Input() public package: Package;
    @Input() public packageFile: PackageFile;

    constructor(private snackBarService: SnackBarService) {}

    ngOnInit(): void {}
    getRecordCount(packageFile) {
        if (packageFile == null) return "";

        return packageFile.schemas.reduce((a, b) => a + (b.recordCount || 0), 0);
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
}
