import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { take } from "rxjs/operators";
import { Package, PackageGQL } from "src/generated/graphql";

@Injectable({
    providedIn: "root"
})
export class PackageService {
    package = new BehaviorSubject<Package>(null);

    constructor(private packageGQL: PackageGQL) {}

    getPackage(catalogSlug: string, packageSlug: string) {
        this.packageGQL
            .fetch({ identifier: { catalogSlug, packageSlug } })
            .pipe(take(1))
            .subscribe(({ data }) => {
                this.package.next(data.package as Package);
            });
    }
}
