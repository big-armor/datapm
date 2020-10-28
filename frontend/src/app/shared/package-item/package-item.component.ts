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

    constructor(private router: Router) {}

    ngOnInit(): void {}

    goToComponent(): void {
        const { catalogSlug, packageSlug } = this.item.identifier;

        this.router.navigate([catalogSlug, packageSlug]);
    }

    get lastActivityLabel(): string {
        return timeago.format(this.item.updatedAt);
    }
}
