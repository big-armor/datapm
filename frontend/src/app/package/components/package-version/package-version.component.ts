import { Component, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { take } from "rxjs/operators";
import { Package } from "src/generated/graphql";

@Component({
    selector: "version",
    templateUrl: "./package-version.component.html",
    styleUrls: ["./package-version.component.scss"]
})
export class PackageVersionComponent implements OnInit {
    public package: Package;

    constructor(private route: ActivatedRoute) {
        this.route.parent.data.pipe(take(1)).subscribe((data) => {
            this.package = data.package;
        });
    }

    ngOnInit(): void {}
}
