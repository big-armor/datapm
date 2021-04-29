import { Component, OnDestroy, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import {
    Compability,
    comparePackages,
    diffCompatibility,
    getSchemaVersionFromPackageFile,
    nextVersion,
    PackageFile,
    parsePackageFileJSON
} from "datapm-lib";
import { ConfirmationDialogService } from "src/app/services/dialog/confirmation-dialog.service";
import { CreateVersionGQL, Package } from "src/generated/graphql";
import { PackageService } from "../../services/package.service";
import SemVer from "semver/classes/semver";
import { Subject } from "rxjs";
import { PageState } from "src/app/models/page-state";

enum Field {
    README,
    LICENSE
}

@Component({
    selector: "app-edit-package-markdown",
    templateUrl: "./edit-package-markdown.component.html",
    styleUrls: ["./edit-package-markdown.component.scss"]
})
export class EditPackageMarkdownComponent implements OnInit, OnDestroy {
    public pageState: PageState = "LOADING";
    public saveState: PageState = "INIT";

    public title: string;
    public content: string;
    public package: Package;

    public packageFile: PackageFile;
    public modifiedPackageFile: PackageFile;

    public field: Field;
    public compatibilty: Compability;

    public destroy = new Subject();

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private packageService: PackageService,
        private createVersionGQL: CreateVersionGQL,
        private confirmModalService: ConfirmationDialogService
    ) {}

    ngOnInit(): void {
        this.pageState = "LOADING";

        this.packageService.package.subscribe((p) => {
            this.package = p.package;

            this.packageFile = parsePackageFileJSON(p.package.latestVersion.packageFile);
            this.modifiedPackageFile = parsePackageFileJSON(p.package.latestVersion.packageFile);

            const field = this.route.snapshot.url[0].path;
            if (field === "readme") {
                this.field = Field.README;
                this.content = this.packageFile.readmeMarkdown;
                this.title = "Read Me";
            } else if (field === "license") {
                this.field = Field.LICENSE;
                this.content = this.packageFile.licenseMarkdown;
                this.title = "License";
            }

            this.pageState = "SUCCESS";
        });
    }

    ngOnDestroy() {
        this.destroy.next();
        this.destroy.complete();
    }

    public save(): void {
        if (this.field == Field.README) {
            this.modifiedPackageFile.readmeMarkdown = this.content;
        } else if (this.field == Field.LICENSE) {
            this.modifiedPackageFile.licenseMarkdown = this.content;
        }

        const diffs = comparePackages(this.packageFile, this.modifiedPackageFile);
        this.compatibilty = diffCompatibility(diffs);
        if (this.compatibilty == Compability.BreakingChange) {
            this.openConfirmModal();
        } else {
            this.confirmSave();
        }
    }

    public confirmSave(): void {
        this.saveState = "LOADING";

        const currentVersion = new SemVer(this.modifiedPackageFile.version);
        const newVersion = nextVersion(currentVersion, this.compatibilty);
        this.modifiedPackageFile.version = newVersion.version;

        this.createVersionGQL
            .mutate({
                identifier: {
                    catalogSlug: this.package.identifier.catalogSlug,
                    packageSlug: this.package.identifier.packageSlug
                },
                value: {
                    packageFile: JSON.stringify(this.modifiedPackageFile)
                }
            })
            .subscribe((result) => {
                if (result.errors) {
                    console.error(result.errors);
                    this.saveState = "ERROR";
                    return;
                }
                this.saveState = "SUCCESS";
                this.goBack();
            });
    }

    public goBack(): void {
        this.packageService.getPackage(this.package.identifier.catalogSlug, this.package.identifier.packageSlug);
        this.router.navigate(["../"], { relativeTo: this.route });
    }

    public openConfirmModal(): void {
        this.confirmModalService
            .openFancyConfirmationDialog({
                data: {
                    title: "Are you sure?",
                    content: "There is a breaking change in your package, are you sure you want to save?"
                }
            })
            .subscribe((confirmed) => {
                if (confirmed) {
                    this.confirmSave();
                }
            });
    }
}
