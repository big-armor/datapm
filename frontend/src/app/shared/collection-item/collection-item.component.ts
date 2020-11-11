import { Component, Input, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { Collection } from "../../../generated/graphql";
import * as timeago from "timeago.js";

@Component({
    selector: "app-collection-item",
    templateUrl: "./collection-item.component.html",
    styleUrls: ["./collection-item.component.scss"]
})
export class CollectionItemComponent implements OnInit {
    @Input() item: Collection;
    @Input() hasImage: boolean;

    constructor(private router: Router) {}

    ngOnInit(): void {}

    goToComponent(): void {
        const { collectionSlug } = this.item.identifier;
        this.router.navigate([collectionSlug]);
    }

    get lastActivityLabel(): string {
        return timeago.format(this.item.updatedAt);
    }

    get truncatedDescription(): string {
        if (!this.item.description) {
            return "";
        }

        if (this.item.description.length > 220) {
            return this.item.description.substr(0, 220) + "...";
        }
        return this.item.description;
    }
}
