import { ChangeDetectorRef, Component, OnInit } from "@angular/core";
import { GetLatestPackagesGQL, Package } from "src/generated/graphql";
import { LimitAndOffset } from "src/app/shared/package-and-collection/limit-and-offset";
import { PackageResponse } from "src/app/package/services/package.service";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { PackagesResponse } from "src/app/shared/package-and-collection/packages-response";
@Component({
    selector: "latest",
    templateUrl: "./latest.component.html",
    styleUrls: ["./latest.component.scss"]
})
export class LatestComponent implements OnInit {
    public readonly LIMIT_PER_LOAD = 1;

    public packagesQuery: Observable<PackagesResponse>;

    constructor(private latestPackages: GetLatestPackagesGQL, private cdr: ChangeDetectorRef) {}

    public ngOnInit(): void {
        this.cdr.detectChanges();
    }

    public updatePackageFetchingQuery(limitAndOffset: LimitAndOffset): void {
        this.packagesQuery = this.latestPackages.fetch(limitAndOffset).pipe(
            map(
                (response) => {
                    if (response.errors) {
                        return {
                            errors: response.errors.map((e) => e.message)
                        };
                    }

                    return {
                        packages: response.data.latestPackages.packages as Package[],
                        hasMore: response.data.latestPackages.hasMore
                    };
                },
                (error) => {
                    return {
                        errors: [error]
                    };
                }
            )
        );
    }
}
