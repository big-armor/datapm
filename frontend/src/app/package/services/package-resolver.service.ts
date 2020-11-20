import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot } from "@angular/router";
import { map, take } from "rxjs/operators";
import { Package, PackageGQL } from "src/generated/graphql";

@Injectable({
    providedIn: "root"
})
export class PackageResolverService implements Resolve<Package> {
    constructor(private packageGQL: PackageGQL) {}

    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): any {
        const catalogSlug = route.paramMap.get("catalogSlug");
        const packageSlug = route.paramMap.get("packageSlug");

        return this.packageGQL.fetch({ identifier: { catalogSlug, packageSlug } }).pipe(
            take(1),
            map(({ data }) => data.package)
        );
    }
}
