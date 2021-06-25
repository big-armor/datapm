import { Component, OnDestroy, OnInit } from "@angular/core";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { FollowersRequest } from "src/app/shared/followers/followers.component";
import { Package, PackageFollowersGQL, User } from "src/generated/graphql";
import { PackageService } from "../../services/package.service";

@Component({
    selector: "app-package-followers",
    templateUrl: "./package-followers.component.html"
})
export class PackageFollowersComponent implements OnInit, OnDestroy {
    private readonly destroy$ = new Subject();

    public package: Package;
    public followers: User[] = [];
    public hasLoadingErrors: boolean;
    public hasMoreFollowers: boolean;
    public loadingFollowers: boolean;

    constructor(private packageService: PackageService, private packageFollowersGQL: PackageFollowersGQL) {}

    public ngOnInit(): void {
        this.packageService.package.pipe(takeUntil(this.destroy$)).subscribe((pkg) => (this.package = pkg.package));
    }

    public ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    public loadFollowers(request: FollowersRequest): void {
        this.loadingFollowers = true;
        this.packageFollowersGQL
            .fetch({
                identifier: {
                    catalogSlug: this.package.identifier.catalogSlug,
                    packageSlug: this.package.identifier.packageSlug
                },
                limit: request.limit,
                offset: request.offset
            })
            .subscribe(
                ({ data, errors }) => {
                    if (errors) {
                        this.hasLoadingErrors = true;
                        console.error(errors);
                        return;
                    }

                    const fetchedFollowers = data.packageFollowers.followers;
                    this.followers.push(...fetchedFollowers);
                    this.hasMoreFollowers = data.packageFollowers.hasMore;
                    this.loadingFollowers = false;
                },
                (errors) => {
                    this.hasLoadingErrors = true;
                    this.loadingFollowers = false;
                    console.error(errors);
                }
            );
    }
}
