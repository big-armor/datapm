import { Component, Input, OnDestroy, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { PackageService } from "src/app/package/services/package.service";
import { AuthenticationService } from "src/app/services/authentication.service";
import { DialogService } from "src/app/services/dialog/dialog.service";
import { CreatePackageIssueGQL, Package, User } from "src/generated/graphql";

@Component({
    selector: "app-create-package-issue",
    templateUrl: "./create-package-issue.component.html",
    styleUrls: ["./create-package-issue.component.scss"]
})
export class CreatePackageIssueComponent implements OnInit, OnDestroy {
    private readonly destroy = new Subject();

    public package: Package;
    public loading = false;
    public submitting = false;

    public currentUser: User;

    public subject: string = "";
    public content: string = "";

    private unsubscribe$ = new Subject();

    constructor(
        private packageService: PackageService,
        private createPackageIssueGQL: CreatePackageIssueGQL,
        private router: Router,
        private dialog: DialogService,
        private route: ActivatedRoute,
        private authenticationService: AuthenticationService
    ) {}

    public ngOnInit(): void {
        this.loadPackage();
        this.authenticationService.currentUser.pipe(takeUntil(this.unsubscribe$)).subscribe((user: User) => {
            this.currentUser = user;
        });
    }

    public openSignUpDialog(): void {
        this.dialog.openSignupDialog();
    }

    public openLoginDialog(): void {
        this.dialog.openLoginDialog();
    }

    public ngOnDestroy(): void {
        this.destroy.next();
        this.destroy.complete();
    }

    public cannotSubmit(): boolean {
        return !this.canSubmit();
    }

    public canSubmit(): boolean {
        return this.content.trim().length > 0 && this.subject.trim().length > 0 && !this.loading && !this.submitting;
    }

    public submitNewIssue(): void {
        if (this.cannotSubmit()) {
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

        this.loading = true;
        this.createPackageIssueGQL.mutate({ issue, packageIdentifier }).subscribe((issue) => {
            if (issue.errors) {
                return;
            }

            this.router.navigate(["../", issue.data.createPackageIssue.issueNumber], { relativeTo: this.route });
        });
    }

    public cancel(): void {
        this.router.navigate(["../"], { relativeTo: this.route });
    }

    private loadPackage(): void {
        this.loading = true;
        this.packageService.package.pipe(takeUntil(this.destroy)).subscribe((packageResponse) => {
            this.package = packageResponse.package;
            this.loading = false;
        });
    }
}
