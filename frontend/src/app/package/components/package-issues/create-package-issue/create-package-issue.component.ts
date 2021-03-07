import { Component, OnDestroy, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { PackageService } from "src/app/package/services/package.service";
import { CreatePackageIssueGQL, Package } from "src/generated/graphql";

@Component({
    selector: "app-create-package-issue",
    templateUrl: "./create-package-issue.component.html",
    styleUrls: ["./create-package-issue.component.scss"]
})
export class CreatePackageIssueComponent implements OnInit, OnDestroy {
    private readonly destroy = new Subject();

    public package: Package;
    public loading = false;

    public subject: string = "";
    public content: string = "";

    constructor(
        private packageService: PackageService,
        private createPackageIssueGQL: CreatePackageIssueGQL,
        private router: Router,
        private route: ActivatedRoute
    ) {}

    public ngOnInit(): void {
        this.loadPackage();
    }

    public ngOnDestroy(): void {
        this.destroy.next();
        this.destroy.complete();
    }

    public isInvalidIssue(): boolean {
        return !this.isValidIssue();
    }

    public isValidIssue(): boolean {
        return this.content.trim().length > 0 && this.subject.trim().length > 0;
    }

    public submitNewIssue(): void {
        if (this.isInvalidIssue()) {
            return;
        }

        const issue = {
            subject: this.subject,
            content: this.content
        };

        const packageIdentifier = {
            catalogSlug: this.package.identifier.catalogSlug,
            packageSlug: this.package.identifier.packageSlug
        };

        this.createPackageIssueGQL.mutate({ issue, packageIdentifier }).subscribe((issue) => {
            if (issue.errors) {
                return;
            }

            this.router.navigate(["../", issue.data.createPackageIssue.issueNumber], { relativeTo: this.route });
        });
    }

    private loadPackage(): void {
        this.loading = true;
        this.packageService.package.pipe(takeUntil(this.destroy)).subscribe((packageResponse) => {
            this.package = packageResponse.package;
            this.loading = false;
        });
    }
}
