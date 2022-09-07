import { Component, Input } from "@angular/core";
import { Catalog, CatalogFollowersGQL, Permission, User } from "src/generated/graphql";
import { FollowersRequest } from "../../../shared/followers/followers.component";

@Component({
    selector: "app-catalog-followers",
    templateUrl: "./catalog-followers.component.html"
})
export class CatalogFollowersComponent {
    @Input()
    public catalog: Catalog;
    public followers: User[] = [];
    public hasLoadingErrors: boolean;
    public hasMoreFollowers: boolean;
    public loadingFollowers: boolean;

    Permission = Permission;
    constructor(private catalogFollowersGQL: CatalogFollowersGQL) {}

    public loadFollowers(request: FollowersRequest): void {
        this.loadingFollowers = true;
        this.catalogFollowersGQL
            .fetch({
                identifier: {
                    catalogSlug: this.catalog.identifier.catalogSlug
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

                    const fetchedFollowers = data.catalogFollowers.followers;
                    this.followers.push(...fetchedFollowers);
                    this.hasMoreFollowers = data.catalogFollowers.hasMore;
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
