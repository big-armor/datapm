import { Component, Input } from "@angular/core";
import { Collection, CollectionFollowersGQL, User } from "src/generated/graphql";
import { FollowersRequest } from "../../../shared/followers/followers.component";

@Component({
    selector: "app-collection-followers",
    templateUrl: "./collection-followers.component.html"
})
export class CollectionFollowersComponent {
    @Input()
    public collection: Collection;
    public followers: User[] = [];
    public hasLoadingErrors: boolean;
    public hasMoreFollowers: boolean;
    public loadingFollowers: boolean;

    constructor(private collectionFollowersGQL: CollectionFollowersGQL) {}

    public loadFollowers(request: FollowersRequest): void {
        setTimeout(() => this.loadFollowersInternal(request),1);
        
    }

    loadFollowersInternal(request: FollowersRequest) {
        this.loadingFollowers = true;
        this.collectionFollowersGQL
            .fetch({
                identifier: {
                    collectionSlug: this.collection.identifier.collectionSlug
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

                    const fetchedFollowers = data.collectionFollowers.followers;
                    this.followers.push(...fetchedFollowers);
                    this.hasMoreFollowers = data.collectionFollowers.hasMore;
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
