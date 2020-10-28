import { Component, Input, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { PackageWithLastActivity } from "src/app/models/package-with-last-activity.model";

@Component({
    selector: "app-package-item",
    templateUrl: "./package-item.component.html",
    styleUrls: ["./package-item.component.scss"]
})
export class PackageItemComponent implements OnInit {
    @Input() item: PackageWithLastActivity;

    constructor(private router: Router) {}

    ngOnInit(): void {}

    goToComponent() {
        const { catalogSlug, packageSlug } = this.item.package.identifier;

        this.router.navigate([catalogSlug, packageSlug]);
    }
}
