import { Component } from "@angular/core";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { Package, Version } from "src/generated/graphql";
import { PackageService, PackageResponse } from "../../services/package.service";

@Component({
    selector: "version",
    templateUrl: "./package-version.component.html",
    styleUrls: ["./package-version.component.scss"]
})
export class PackageVersionComponent {
    public package: Package;
    private unsubscribe$ = new Subject();
    public versions: Version[];

    constructor(private packageService: PackageService) {
        this.packageService.package.pipe(takeUntil(this.unsubscribe$)).subscribe((p: PackageResponse) => {
            if (p == null || p.package == null) return;
            this.package = p.package;
            this.versions = p.package.versions.sort((a, b) => {
                const aDate = a.createdAt.getTime();
                const bDate = b.createdAt.getTime();
                if (aDate > bDate) return -1;
                if (bDate < aDate) return 1;
                return 0;
            });
        });
    }

    ngOnDestroy(): void {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }
}
