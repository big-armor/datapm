import { Component } from "@angular/core";
import { PackageFile } from "datapm-lib";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { Package } from "src/generated/graphql";
import { PackageService } from "../../services/package.service";

@Component({
    selector: "package-description",
    templateUrl: "./package-description.component.html",
    styleUrls: ["./package-description.component.scss"]
})
export class PackageDescriptionComponent {
    public package: Package;
    public packageFile: PackageFile;
    private unsubscribe$ = new Subject();

    constructor(private packageService: PackageService) {
        this.packageService.package.pipe(takeUntil(this.unsubscribe$)).subscribe((p: Package) => {
            this.package = p;
            console.log(p);
        });
    }

    ngOnDestroy(): void {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }
}
