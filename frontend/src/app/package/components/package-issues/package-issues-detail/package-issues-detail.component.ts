import { Component, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { PackageService } from "src/app/package/services/package.service";
import { PackageIdentifierInput, PackageIssue, PackageIssueGQL } from "src/generated/graphql";

@Component({
    selector: "app-package-issues-detail",
    templateUrl: "./package-issues-detail.component.html",
    styleUrls: ["./package-issues-detail.component.scss"]
})
export class PackageIssuesDetailComponent implements OnInit {
    public packageIssue: PackageIssue;
    public packageIdentifier: PackageIdentifierInput;

    public errorMessage: string;
    private packageIssueNumber: number;

    constructor(
        private packageService: PackageService,
        private packageIssueGQL: PackageIssueGQL,
        private route: ActivatedRoute
    ) {}

    public ngOnInit(): void {
        this.packageIssueNumber = this.route.snapshot.params.issueNumber;
        if (this.packageIssueNumber) {
            this.loadPackage();
        } else {
            this.errorMessage = "Invalid issue number";
        }
    }

    public deleteIssue(): void {
        console.log("hhehe");
    }

    private loadPackage(): void {
        this.packageService.package.subscribe((packageResponse) => {
            this.packageIdentifier = {
                catalogSlug: packageResponse.package.identifier.catalogSlug,
                packageSlug: packageResponse.package.identifier.packageSlug
            };
            this.loadPackageIssue();
        });
    }

    private loadPackageIssue(): void {
        this.packageIssueGQL
            .fetch({
                packageIdentifier: this.packageIdentifier,
                packageIssueIdentifier: { issueNumber: this.packageIssueNumber }
            })
            .subscribe((response) => {
                if (response.errors) {
                    if (response.errors[0].message.includes("ISSUE_NOT_FOUND")) {
                        this.errorMessage = "Issue not found";
                    }
                    return;
                }

                this.packageIssue = response.data.packageIssue;
            });
    }
}
