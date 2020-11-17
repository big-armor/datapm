import { Component } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { take } from "rxjs/operators";
import { Package } from "src/generated/graphql";

@Component({
    selector: "package-detail",
    templateUrl: "./package-detail.component.html",
    styleUrls: ["./package-detail.component.scss"]
})
export class PackageDetailComponent {
    public package: Package;

    constructor(private route: ActivatedRoute) {
        this.route.parent.data.pipe(take(1)).subscribe((data) => {
            this.package = data.package;
        });
    }
}
