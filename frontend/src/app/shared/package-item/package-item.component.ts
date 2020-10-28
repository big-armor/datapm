import { Component, Input, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { Package } from "src/generated/graphql";
import * as timeago from "timeago.js";

@Component({
    selector: "app-package-item",
    templateUrl: "./package-item.component.html",
    styleUrls: ["./package-item.component.scss"]
})
export class PackageItemComponent implements OnInit {
    @Input() item: Package;
    @Input() hasImage: boolean;

    constructor(private router: Router) {}

    ngOnInit(): void {}

    goToComponent(): void {
        const { catalogSlug, packageSlug } = this.item.identifier;

        this.router.navigate([catalogSlug, packageSlug]);
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
