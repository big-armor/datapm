import { Component, OnInit } from "@angular/core";
import { Package, PackageGQL, PackageQuery } from "src/generated/graphql";
import { Route, ActivatedRoute } from "@angular/router";
import * as URLParse from "url-parse";
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

    package: Package;
    urlParams: any;
    packageQuery: PackageQuery;
    public packageFile: PackageFile;

    constructor(private packageGQL: PackageGQL, private route: ActivatedRoute) {}

    ngOnInit(): void {
        this.route.paramMap.subscribe((params) => {
            this.urlParams = params;

            this.state = State.LOADING;
            this.packageGQL
                .watch({
                    identifier: {
                        catalogSlug: this.urlParams.params.catalogSlug,
                        packageSlug: this.urlParams.params.packageSlug
                    }
                })
                .valueChanges.subscribe(({ data }) => {
                    this.state = State.SUCCESS;
                    this.packageQuery = data;
                    if (data.package && data.package.latestVersion) {
                        this.packageFile = JSON.parse(data.package.latestVersion.packageFile);
                    }
                });
        });
    }

    generateFetchCommand() {
        return "datapm fetch " + packageToIdentifier(this.packageQuery.package.identifier);
    }
}
