import { Clipboard } from "@angular/cdk/clipboard";
import { Component, Inject, OnInit } from "@angular/core";
import { MAT_DIALOG_DATA } from "@angular/material/dialog";
import { getRegistryURL } from "src/app/helpers/RegistryAccessHelper";
import { SnackBarService } from "src/app/services/snackBar.service";
import { Package } from "src/generated/graphql";

@Component({
    selector: "app-share-package",
    templateUrl: "./share-package.component.html",
    styleUrls: ["./share-package.component.scss"]
})
export class SharePackageComponent implements OnInit {
    constructor(
        @Inject(MAT_DIALOG_DATA) public userPackage: Package,
        public clipboard: Clipboard,
        private snackBarService: SnackBarService
    ) {}

    ngOnInit(): void {}

    public redditLink() {
        let redditUrl = "http://www.reddit.com/submit?url=";
        return redditUrl + this.packageUrl() + "&title=" + this.userPackage.displayName;
    }

    public facebookLink() {
        let facebookUrl = "https://www.facebook.com/sharer/sharer.php?u=" + this.packageUrl();
        return facebookUrl;
    }

    public twitterLink() {
        let twitterUrl =
            "https://twitter.com/intent/tweet?url=" + this.packageUrl() + "&text=" + this.userPackage.displayName;
        return twitterUrl;
    }

    public emailLink() {
        let emailUrl = "mailto:?subject=" + this.userPackage.displayName + "&body=" + this.packageUrl();
        return emailUrl;
    }

    public copyPackagelink() {
        this.clipboard.copy(this.packageUrl());

        this.snackBarService.openSnackBar("Copied the package URL!", "");
    }

    packageUrl() {
        return (
            getRegistryURL() +
            "/" +
            this.userPackage.identifier.catalogSlug +
            "/" +
            this.userPackage.identifier.packageSlug
        );
    }
}
