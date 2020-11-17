import { Component, OnDestroy } from "@angular/core";
import { Title } from "@angular/platform-browser";
import { ActivatedRoute } from "@angular/router";
import { PackageFile } from "datapm-lib";
import { Subject } from "rxjs";
import { take } from "rxjs/operators";
import { packageToIdentifier } from "src/app/helpers/IdentifierHelper";
import { Package } from "src/generated/graphql";

@Component({
    selector: "package",
    templateUrl: "./package.component.html",
    styleUrls: ["./package.component.scss"]
})
export class PackageComponent implements OnDestroy {
    public package: Package;
    public packageFile: PackageFile;

    private subscription = new Subject();

    public readonly routes = [
        { linkName: "details", url: "details" },
        { linkName: "schema", url: "schema" },
        { linkName: "version", url: "version" }
    ];

    constructor(private route: ActivatedRoute, private title: Title) {}

    ngOnInit() {
        this.route.data.pipe(take(1)).subscribe((data) => {
            this.package = data.package;
            if (this.package && this.package.latestVersion) {
                this.packageFile = JSON.parse(this.package.latestVersion.packageFile);
            }
            this.title.setTitle(`${this.package?.displayName} - datapm`);
            console.log(this.package);
        });
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    get generatedFetchCommand() {
        return this.package ? "datapm fetch " + packageToIdentifier(this.package.identifier) : "";
    }

    copyCommand() {
        const el = document.createElement("textarea");
        el.value = this.generatedFetchCommand;
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
    }
}
