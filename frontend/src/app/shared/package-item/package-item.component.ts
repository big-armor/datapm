import { Component, Input, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { Package } from "src/app/models/packge.model";
import * as timeago from "timeago.js";

@Component({
    selector: "app-package-item",
    templateUrl: "./package-item.component.html",
    styleUrls: ["./package-item.component.scss"]
})
export class PackageItemComponent implements OnInit {
    @Input() item: Package;
    @Input()
    tags: string[] = ["weather", "oceanic", "streaming", "blue", "data"];
    description =
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";

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
