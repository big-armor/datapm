import { Component, OnInit } from "@angular/core";
import { Package, PackageGQL, PackageQuery } from "src/generated/graphql";
import { ActivatedRoute } from "@angular/router";
import { packageToIdentifier } from "../../helpers/IdentifierHelper";
import { PackageFile } from "datapm-lib";

enum State {
    LOADING,
    SUCCESS,
    ERROR
}

@Component({
    selector: "package-detail",
    templateUrl: "./package-detail.component.html",
    styleUrls: ["./package-detail.component.scss"]
})
export class PackageDetailComponent implements OnInit {
    State = State;
    state = State.LOADING;

    packageQuery: PackageQuery;
    public packageFile: PackageFile;

    constructor(private packageGQL: PackageGQL, private route: ActivatedRoute) {}

    ngOnInit(): void {
        const catalogSlug = this.route.snapshot.parent.paramMap.get("catalogSlug");
        const packageSlug = this.route.snapshot.parent.paramMap.get("packageSlug");

        this.state = State.LOADING;
        this.packageGQL
            .watch({
                identifier: { catalogSlug, packageSlug }
            })
            .valueChanges.subscribe(({ data }) => {
                this.state = State.SUCCESS;
                this.packageQuery = data;
                if (data.package && data.package.latestVersion) {
                    this.packageFile = JSON.parse(data.package.latestVersion.packageFile);
                }
            });
    }

    generateFetchCommand() {
        return "datapm fetch " + packageToIdentifier(this.packageQuery.package.identifier);
    }
}
