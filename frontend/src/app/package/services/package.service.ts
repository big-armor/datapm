import { Injectable } from "@angular/core";
import { ApolloQueryResult } from "@apollo/client/core";
import { BehaviorSubject } from "rxjs";
import { take } from "rxjs/operators";
import { Package, PackageGQL, PackageQuery } from "src/generated/graphql";
export interface PackageResponse {
    package: Package | null;
    response?: ApolloQueryResult<PackageQuery> | null;
}
@Injectable({
    providedIn: "root"
})
export class PackageService {
    package = new BehaviorSubject<PackageResponse>(null);
    packageError = new BehaviorSubject<Error>(null);
    constructor(private packageGQL: PackageGQL) {}
    getPackage(catalogSlug: string, packageSlug: string) {
        this.packageGQL
            .fetch({ identifier: { catalogSlug, packageSlug } })
            .pipe(take(1))
            .subscribe(
                (response) => {
                    if (response.data == null)
                        this.package.next({
                            package: null,
                            response: response
                        });
                    else
                        this.package.next({
                            package: response.data.package as Package,
                            response: response
                        });
                },
                (error) => {
                    console.log(error);
                    this.package.next({
                        package: null,
                        response: null
                    });
                    this.packageError.next(error);
                }
            );
    }
}
