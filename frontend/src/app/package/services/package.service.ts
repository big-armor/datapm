import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { take } from "rxjs/operators";
import { Package, PackageGQL } from "src/generated/graphql";
export interface PackageResponse {
    package: Package | null;
    error: Error | null;
}
@Injectable({
    providedIn: "root"
})
export class PackageService {
    package = new BehaviorSubject<PackageResponse>(null);
    constructor(private packageGQL: PackageGQL) {}
    getPackage(catalogSlug: string, packageSlug: string) {
        this.packageGQL
            .fetch({ identifier: { catalogSlug, packageSlug } })
            .pipe(take(1))
            .subscribe(
                ({ data }) => {
                    if (data == null)
                        this.package.next({
                            package: null,
                            error: { name: "unknown error", message: "network level error" }
                        });
                    else
                        this.package.next({
                            package: data.package as Package,
                            error: null
                        });
                },
                (error) => {
                    console.log(error);

                    this.package.next({
                        package: null,
                        error
                    });
                }
            );
    }
}
